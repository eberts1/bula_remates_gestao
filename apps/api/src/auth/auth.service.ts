import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { AuthResponse, AuthTokens, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { seedTenantIntentions } from '../common/tenant-intentions.util';

@Injectable()
export class AuthService {
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.refreshTtlSeconds = Number(config.get('JWT_REFRESH_TTL_SECONDS', 604800));
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const slugTaken = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
    if (slugTaken) {
      throw new ConflictException('Slug da empresa já está em uso');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          slug: dto.tenantSlug,
          name: dto.tenantName,
        },
      });

      await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'owner',
        },
      });

      await tx.client.create({
        data: {
          tenantId: tenant.id,
          ownerId: user.id,
          name: 'Geral',
          document: '00000000000',
          isDefault: true,
        },
      });

      await seedTenantIntentions(tx, tenant.id);

      return { user, tenant };
    });

    const tokens = await this.issueTokens({
      sub: result.user.id,
      email: result.user.email,
      tenantId: result.tenant.id,
      role: 'owner',
      isSuperAdmin: result.user.isSuperAdmin,
    });

    return {
      ...tokens,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      tenant: {
        id: result.tenant.id,
        slug: result.tenant.slug,
        name: result.tenant.name,
      },
    };
  }

  async login(
    dto: LoginDto,
    ctx?: { ip?: string; userAgent?: string },
  ): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: {
          include: { tenant: true },
          take: 1,
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!user) {
      void this.audit.log({
        action: 'auth.login.failed',
        actorEmail: dto.email,
        summary: `Login falhou: e-mail não encontrado (${dto.email})`,
        metadata: { email: dto.email },
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      void this.audit.log({
        tenantId: user.memberships[0]?.tenantId,
        userId: user.id,
        actorEmail: dto.email,
        action: 'auth.login.failed',
        summary: `Login falhou: senha inválida (${dto.email})`,
        metadata: { email: dto.email },
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('Usuário sem empresa vinculada');
    }

    void this.audit.log({
      tenantId: membership.tenantId,
      userId: user.id,
      actorEmail: user.email,
      action: 'auth.login.success',
      entityType: 'user',
      entityId: user.id,
      summary: `Login realizado por ${user.email}`,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
    });

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      tenantId: membership.tenantId,
      role: membership.role,
      isSuperAdmin: user.isSuperAdmin,
    });

    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name },
      tenant: {
        id: membership.tenant.id,
        slug: membership.tenant.slug,
        name: membership.tenant.name,
      },
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const stored = await this.redis.getClient().get(`refresh:${payload.jti}`);
    if (!stored) {
      throw new UnauthorizedException('Sessão expirada');
    }

    const session = JSON.parse(stored) as {
      userId: string;
      tenantId: string;
      role: string;
      email: string;
      isSuperAdmin: boolean;
    };

    await this.redis.getClient().del(`refresh:${payload.jti}`);

    return this.issueTokens({
      sub: session.userId,
      email: session.email,
      tenantId: session.tenantId,
      role: session.role as JwtPayload['role'],
      isSuperAdmin: session.isSuperAdmin ?? false,
    });
  }

  async logout(refreshToken?: string, accessJti?: string, accessExp?: number) {
    if (refreshToken) {
      try {
        const payload = await this.jwt.verifyAsync<{ jti: string }>(refreshToken, {
          secret: process.env.JWT_REFRESH_SECRET,
        });
        await this.redis.getClient().del(`refresh:${payload.jti}`);
      } catch {
        /* ignore */
      }
    }
    if (accessJti && accessExp) {
      const ttl = accessExp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.getClient().setex(`bl:${accessJti}`, ttl, '1');
      }
    }
  }

  async me(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, isSuperAdmin: true },
    });

    const membership = await this.prisma.tenantMember.findUniqueOrThrow({
      where: { tenantId_userId: { tenantId, userId } },
      include: { tenant: true },
    });

    return {
      user,
      tenant: {
        id: membership.tenant.id,
        slug: membership.tenant.slug,
        name: membership.tenant.name,
      },
      role: membership.role,
      isSuperAdmin: user.isSuperAdmin,
    };
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const accessToken = await this.jwt.signAsync(
      { ...payload, jti: accessJti },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: (process.env.JWT_ACCESS_EXPIRES ?? '15m') as `${number}m`,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: payload.sub, jti: refreshJti },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: `${this.refreshTtlSeconds}s`,
      },
    );

    await this.redis.getClient().setex(
      `refresh:${refreshJti}`,
      this.refreshTtlSeconds,
      JSON.stringify({
        userId: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email,
        isSuperAdmin: payload.isSuperAdmin,
      }),
    );

    return { accessToken, refreshToken };
  }
}

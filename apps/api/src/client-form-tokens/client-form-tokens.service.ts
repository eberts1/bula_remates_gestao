import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientFormTokenType } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';
import { generateFormToken } from '../common/token.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormTokenDto } from './dto/create-form-token.dto';

const DEFAULT_EXPIRES_HOURS = 72;

@Injectable()
export class ClientFormTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(user: JwtPayload, dto: CreateFormTokenDto, clientIdFromRoute?: string) {
    const type = dto.type;
    const clientId = clientIdFromRoute ?? dto.clientId;

    if (type === ClientFormTokenType.edit) {
      if (!clientId) {
        throw new BadRequestException('clientId é obrigatório para link de edição');
      }
      const client = await this.prisma.client.findFirst({
        where: { id: clientId, tenantId: user.tenantId, deletedAt: null },
      });
      if (!client) throw new NotFoundException('Cliente não encontrado');
    } else if (clientId) {
      throw new BadRequestException('Link de criação não deve ter clientId');
    }

    const hours = dto.expiresInHours ?? DEFAULT_EXPIRES_HOURS;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const { raw, hash } = generateFormToken();

    const record = await this.prisma.clientFormToken.create({
      data: {
        tenantId: user.tenantId,
        type,
        clientId: type === ClientFormTokenType.edit ? clientId : null,
        tokenHash: hash,
        expiresAt,
        createdById: user.sub,
      },
    });

    const webUrl =
      this.config.get<string>('WEB_URL') ??
      this.config.get<string>('WEB_PUBLIC_URL') ??
      'http://localhost:3000';

    return {
      tokenId: record.id,
      url: `${webUrl.replace(/\/$/, '')}/cadastro/${raw}`,
      expiresAt: expiresAt.toISOString(),
      type: record.type,
      clientId: record.clientId,
    };
  }

  async list(user: JwtPayload, clientId?: string) {
    const now = new Date();
    const items = await this.prisma.clientFormToken.findMany({
      where: {
        tenantId: user.tenantId,
        revokedAt: null,
        expiresAt: { gt: now },
        ...(clientId ? { clientId } : {}),
        OR: [
          { type: ClientFormTokenType.create },
          { type: ClientFormTokenType.edit, usedAt: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      items: items.map((t) => ({
        id: t.id,
        type: t.type,
        clientId: t.clientId,
        expiresAt: t.expiresAt.toISOString(),
        usedAt: t.usedAt?.toISOString() ?? null,
        submittedAt: t.submittedAt?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  async revoke(user: JwtPayload, id: string) {
    const token = await this.prisma.clientFormToken.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!token) throw new NotFoundException('Link não encontrado');

    await this.prisma.clientFormToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }
}

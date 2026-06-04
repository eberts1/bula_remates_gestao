import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../auth/auth.types';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async overview() {
    const [
      tenantCount,
      userCount,
      clientCount,
      importBatchCount,
      recentLogs,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.client.count({ where: { deletedAt: null } }),
      this.prisma.clientImportBatch.count(),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      }),
    ]);

    return {
      totals: {
        tenants: tenantCount,
        users: userCount,
        clients: clientCount,
        imports: importBatchCount,
      },
      recentLogs,
    };
  }

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            members: true,
            clients: { where: { deletedAt: null } },
          },
        },
      },
    });

    return {
      items: tenants.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        createdAt: t.createdAt,
        memberCount: t._count.members,
        clientCount: t._count.clients,
      })),
    };
  }

  async listLogs(params: {
    tenantId?: string;
    userId?: string;
    action?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = { contains: params.action, mode: 'insensitive' };
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }
    if (params.q) {
      where.OR = [
        { summary: { contains: params.q, mode: 'insensitive' } },
        { actorEmail: { contains: params.q, mode: 'insensitive' } },
        { action: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async listCollaborators(tenantId: string) {
    const items = await this.prisma.collaborator.findMany({
      where: { tenantId, deletedAt: null, active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        userId: true,
        team: { select: { id: true, name: true } },
      },
    });
    return { items };
  }

  async listUsers(params: { q?: string; tenantId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (params.q) {
      where.OR = [
        { email: { contains: params.q, mode: 'insensitive' } },
        { name: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    if (params.tenantId) {
      where.memberships = { some: { tenantId: params.tenantId } };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          isSuperAdmin: true,
          createdAt: true,
          deletedAt: true,
          memberships: {
            include: {
              tenant: { select: { id: true, name: true, slug: true } },
            },
          },
          collaborators: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              email: true,
              tenantId: true,
              team: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        isSuperAdmin: u.isSuperAdmin,
        active: u.deletedAt === null,
        createdAt: u.createdAt,
        memberships: u.memberships.map((m) => ({
          tenantId: m.tenantId,
          tenantName: m.tenant.name,
          tenantSlug: m.tenant.slug,
          role: m.role,
        })),
        collaborators: u.collaborators,
      })),
      total,
      page,
      limit,
    };
  }

  async createUser(actor: JwtPayload, dto: CreateAdminUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (dto.collaboratorId) {
      const collab = await this.prisma.collaborator.findFirst({
        where: { id: dto.collaboratorId, tenantId: dto.tenantId, deletedAt: null },
      });
      if (!collab) {
        throw new NotFoundException('Colaborador não encontrado nesta empresa');
      }
      if (collab.userId) {
        throw new ConflictException('Colaborador já vinculado a outro usuário');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash,
          isSuperAdmin: dto.isSuperAdmin ?? false,
        },
      });

      await tx.tenantMember.create({
        data: {
          tenantId: dto.tenantId,
          userId: created.id,
          role: dto.role,
        },
      });

      if (dto.collaboratorId) {
        await tx.collaborator.update({
          where: { id: dto.collaboratorId },
          data: { userId: created.id },
        });
      }

      return created;
    });

    void this.audit.log({
      tenantId: dto.tenantId,
      userId: actor.sub,
      actorEmail: actor.email,
      action: 'admin.user.create',
      entityType: 'user',
      entityId: user.id,
      summary: `Super-admin criou usuário ${user.email}`,
      metadata: { email: user.email, tenantId: dto.tenantId, role: dto.role },
    });

    return this.findUserById(user.id);
  }

  async updateUser(actor: JwtPayload, id: string, dto: UpdateAdminUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { memberships: true, collaborators: true },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (dto.collaboratorId) {
      const tenantId = dto.tenantId ?? user.memberships[0]?.tenantId;
      if (!tenantId) {
        throw new ConflictException('Usuário sem empresa vinculada');
      }
      const collab = await this.prisma.collaborator.findFirst({
        where: { id: dto.collaboratorId, tenantId, deletedAt: null },
      });
      if (!collab) {
        throw new NotFoundException('Colaborador não encontrado');
      }
      if (collab.userId && collab.userId !== id) {
        throw new ConflictException('Colaborador já vinculado a outro usuário');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const userData: Prisma.UserUpdateInput = {};
      if (dto.name !== undefined) userData.name = dto.name;
      if (dto.isSuperAdmin !== undefined) userData.isSuperAdmin = dto.isSuperAdmin;
      if (dto.active === false) userData.deletedAt = new Date();
      if (dto.active === true) userData.deletedAt = null;
      if (dto.password) userData.passwordHash = await bcrypt.hash(dto.password, 12);

      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id }, data: userData });
      }

      if (dto.tenantId && dto.role) {
        const membership = user.memberships[0];
        if (membership) {
          if (membership.tenantId !== dto.tenantId) {
            await tx.tenantMember.delete({
              where: { tenantId_userId: { tenantId: membership.tenantId, userId: id } },
            });
            await tx.tenantMember.create({
              data: { tenantId: dto.tenantId, userId: id, role: dto.role },
            });
          } else {
            await tx.tenantMember.update({
              where: { tenantId_userId: { tenantId: dto.tenantId, userId: id } },
              data: { role: dto.role },
            });
          }
        } else {
          await tx.tenantMember.create({
            data: { tenantId: dto.tenantId, userId: id, role: dto.role },
          });
        }
      } else if (dto.role && user.memberships[0]) {
        await tx.tenantMember.update({
          where: {
            tenantId_userId: {
              tenantId: user.memberships[0].tenantId,
              userId: id,
            },
          },
          data: { role: dto.role },
        });
      }

      if (dto.collaboratorId !== undefined) {
        await tx.collaborator.updateMany({
          where: { userId: id },
          data: { userId: null },
        });
        if (dto.collaboratorId) {
          await tx.collaborator.update({
            where: { id: dto.collaboratorId },
            data: { userId: id },
          });
        }
      }
    });

    void this.audit.log({
      userId: actor.sub,
      actorEmail: actor.email,
      action: 'admin.user.update',
      entityType: 'user',
      entityId: id,
      summary: `Super-admin atualizou usuário ${user.email}`,
      metadata: dto as Prisma.InputJsonValue,
    });

    return this.findUserById(id);
  }

  async deleteUser(actor: JwtPayload, id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.collaborator.updateMany({
        where: { userId: id },
        data: { userId: null },
      }),
    ]);

    void this.audit.log({
      userId: actor.sub,
      actorEmail: actor.email,
      action: 'admin.user.delete',
      entityType: 'user',
      entityId: id,
      summary: `Super-admin desativou usuário ${user.email}`,
    });

    return { ok: true };
  }

  private async findUserById(id: string) {
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        createdAt: true,
        deletedAt: true,
        memberships: {
          include: { tenant: { select: { id: true, name: true, slug: true } } },
        },
        collaborators: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            email: true,
            tenantId: true,
            team: { select: { id: true, name: true } },
          },
        },
      },
    });

    return {
      id: u.id,
      email: u.email,
      name: u.name,
      isSuperAdmin: u.isSuperAdmin,
      active: u.deletedAt === null,
      createdAt: u.createdAt,
      memberships: u.memberships.map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        tenantSlug: m.tenant.slug,
        role: m.role,
      })),
      collaborators: u.collaborators,
    };
  }
}

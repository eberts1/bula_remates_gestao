import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { JwtPayload } from '../auth/auth.types';

import { PrismaService } from '../prisma/prisma.service';

import { CreateTeamDto } from './dto/create-team.dto';

import { UpdateTeamDto } from './dto/update-team.dto';



@Injectable()

export class TeamsService {

  constructor(private readonly prisma: PrismaService) {}



  async list(user: JwtPayload) {

    const items = await this.prisma.team.findMany({

      where: { tenantId: user.tenantId, deletedAt: null },

      orderBy: { name: 'asc' },

      include: {

        _count: {

          select: { collaborators: { where: { deletedAt: null } } },

        },

      },

    });

    return {

      items: items.map((t) => ({

        id: t.id,

        name: t.name,

        description: t.description,

        collaboratorCount: t._count.collaborators,

        createdAt: t.createdAt.toISOString(),

      })),

    };

  }



  async findOne(user: JwtPayload, id: string) {

    const team = await this.prisma.team.findFirst({

      where: { id, tenantId: user.tenantId, deletedAt: null },

    });

    if (!team) throw new NotFoundException('Equipe não encontrada');

    return {

      id: team.id,

      name: team.name,

      description: team.description,

      createdAt: team.createdAt.toISOString(),

    };

  }



  async create(user: JwtPayload, dto: CreateTeamDto) {

    const team = await this.prisma.team.create({

      data: {

        tenantId: user.tenantId,

        name: dto.name,

        description: dto.description ?? null,

      },

    });

    return this.findOne(user, team.id);

  }



  async update(user: JwtPayload, id: string, dto: UpdateTeamDto) {

    await this.findOrThrow(user.tenantId, id);

    await this.prisma.team.update({

      where: { id },

      data: {

        ...(dto.name !== undefined ? { name: dto.name } : {}),

        ...(dto.description !== undefined

          ? { description: dto.description ?? null }

          : {}),

      },

    });

    return this.findOne(user, id);

  }



  async remove(user: JwtPayload, id: string) {

    await this.findOrThrow(user.tenantId, id);

    const collabCount = await this.prisma.collaborator.count({

      where: { teamId: id, deletedAt: null },

    });

    if (collabCount > 0) {

      throw new BadRequestException(
        'Equipe possui colaboradores. Remova ou mova-os antes de excluir.',
      );

    }

    await this.prisma.team.update({

      where: { id },

      data: { deletedAt: new Date() },

    });

    return { ok: true };

  }



  async assertTeamBelongsToTenant(tenantId: string, teamId: string) {

    const team = await this.prisma.team.findFirst({

      where: { id: teamId, tenantId, deletedAt: null },

    });

    if (!team) throw new NotFoundException('Equipe não encontrada');

    return team;

  }



  private async findOrThrow(tenantId: string, id: string) {

    const team = await this.prisma.team.findFirst({

      where: { id, tenantId, deletedAt: null },

    });

    if (!team) throw new NotFoundException('Equipe não encontrada');

    return team;

  }

}



import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { JwtPayload } from '../auth/auth.types';

import { PrismaService } from '../prisma/prisma.service';

import { TeamsService } from '../teams/teams.service';

import { CreateCollaboratorDto } from './dto/create-collaborator.dto';

import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';



@Injectable()

export class CollaboratorsService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly teamsService: TeamsService,

  ) {}



  async list(

    user: JwtPayload,

    q?: string,

    teamId?: string,

    active?: boolean,

    page = 1,

    limit = 20,

  ) {

    const skip = (page - 1) * limit;

    const where: Prisma.CollaboratorWhereInput = {

      tenantId: user.tenantId,

      deletedAt: null,

      ...(teamId ? { teamId } : {}),

      ...(active !== undefined ? { active } : {}),

      ...(q

        ? {

            OR: [

              { name: { contains: q, mode: 'insensitive' } },

              { email: { contains: q, mode: 'insensitive' } },

            ],

          }

        : {}),

    };



    const [items, total] = await Promise.all([

      this.prisma.collaborator.findMany({

        where,

        orderBy: { name: 'asc' },

        skip,

        take: limit,

        include: { team: { select: { id: true, name: true } } },

      }),

      this.prisma.collaborator.count({ where }),

    ]);



    return {

      items: items.map((c) => this.serialize(c)),

      total,

      page,

      limit,

      totalPages: Math.ceil(total / limit),

    };

  }



  async findOne(user: JwtPayload, id: string) {

    const collab = await this.prisma.collaborator.findFirst({

      where: { id, tenantId: user.tenantId, deletedAt: null },

      include: { team: { select: { id: true, name: true } } },

    });

    if (!collab) throw new NotFoundException('Colaborador não encontrado');

    return this.serialize(collab);

  }



  async create(user: JwtPayload, dto: CreateCollaboratorDto) {

    await this.teamsService.assertTeamBelongsToTenant(user.tenantId, dto.teamId);



    const collab = await this.prisma.collaborator.create({

      data: {

        tenantId: user.tenantId,

        teamId: dto.teamId,

        name: dto.name,

        email: dto.email || null,

        phone: dto.phone ?? null,

        role: dto.role ?? null,

        active: dto.active ?? true,

      },

      include: { team: { select: { id: true, name: true } } },

    });

    return this.serialize(collab);

  }



  async update(user: JwtPayload, id: string, dto: UpdateCollaboratorDto) {

    await this.findOrThrow(user.tenantId, id);



    if (dto.teamId) {

      await this.teamsService.assertTeamBelongsToTenant(user.tenantId, dto.teamId);

    }



    const collab = await this.prisma.collaborator.update({

      where: { id },

      data: {

        ...(dto.teamId !== undefined ? { teamId: dto.teamId } : {}),

        ...(dto.name !== undefined ? { name: dto.name } : {}),

        ...(dto.email !== undefined ? { email: dto.email || null } : {}),

        ...(dto.phone !== undefined ? { phone: dto.phone ?? null } : {}),

        ...(dto.role !== undefined ? { role: dto.role ?? null } : {}),

        ...(dto.active !== undefined ? { active: dto.active } : {}),

      },

      include: { team: { select: { id: true, name: true } } },

    });

    return this.serialize(collab);

  }



  async remove(user: JwtPayload, id: string) {

    await this.findOrThrow(user.tenantId, id);

    await this.prisma.collaborator.update({

      where: { id },

      data: { deletedAt: new Date(), active: false },

    });

    return { ok: true };

  }



  private async findOrThrow(tenantId: string, id: string) {

    const collab = await this.prisma.collaborator.findFirst({

      where: { id, tenantId, deletedAt: null },

    });

    if (!collab) throw new NotFoundException('Colaborador não encontrado');

    return collab;

  }



  private serialize(collab: {

    id: string;

    name: string;

    email: string | null;

    phone: string | null;

    role: string | null;

    active: boolean;

    teamId: string;

    createdAt: Date;

    team?: { id: string; name: string };

  }) {

    return {

      id: collab.id,

      name: collab.name,

      email: collab.email,

      phone: collab.phone,

      role: collab.role,

      active: collab.active,

      teamId: collab.teamId,

      team: collab.team ?? null,

      createdAt: collab.createdAt.toISOString(),

    };

  }

}



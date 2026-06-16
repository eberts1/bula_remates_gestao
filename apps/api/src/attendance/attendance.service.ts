import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ATTENDANCE_ACTION_STATUS_OPEN,
  ATTENDANCE_ACTION_STATUS_DONE,
  ATTENDANCE_ACTIVITY_TYPES,
  DEFAULT_BOARD_COLUMNS,
} from '@docs/shared';
import { JwtPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActionDto } from './dto/create-action.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const DEFAULT_LIMIT_PER_COLUMN = 50;
const MAX_LIMIT_PER_COLUMN = 200;

const actionCardInclude = {
  client: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      animalType: true,
      animalSex: true,
      livestockCategory: true,
      responsible: { select: { id: true, name: true } },
      intentions: {
        include: {
          intention: { select: { id: true, code: true, label: true } },
        },
      },
    },
  },
  auction: {
    select: { id: true, name: true, scheduledAt: true, status: true },
  },
  tasks: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.AttendanceActionInclude;

type ActionWithRelations = Prisma.AttendanceActionGetPayload<{
  include: typeof actionCardInclude;
}>;

export interface AttendanceActionCard {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  status: string;
  sortOrder: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    animalType: string | null;
    animalSex: string | null;
    livestockCategory: string | null;
    responsible: { id: string; name: string } | null;
    intentions: Array<{ id: string; code: string; label: string }>;
  };
  auction: {
    id: string;
    name: string;
    scheduledAt: string | null;
    status: string;
  } | null;
  taskProgress: { done: number; total: number };
}

export interface AttendanceBoardColumn {
  id: string;
  title: string;
  color: string | null;
  sortOrder: number;
  cards: AttendanceActionCard[];
  total: number;
  hasMore: boolean;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getBoard(
    user: JwtPayload,
    params: {
      q?: string;
      auctionId?: string;
      limitPerColumn?: number;
    },
  ) {
    const limitPerColumn = this.normalizeLimit(params.limitPerColumn);
    await this.ensureDefaultColumns(user);

    const columns = await this.prisma.attendanceBoardColumn.findMany({
      where: {
        tenantId: user.tenantId,
        ownerId: user.sub,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });

    const actionWhere = this.buildActionWhere(user, params);

    const actions = await this.prisma.attendanceAction.findMany({
      where: actionWhere,
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      include: actionCardInclude,
    });

    const grouped = new Map<string, ActionWithRelations[]>(
      columns.map((col) => [col.id, []]),
    );

    for (const action of actions) {
      const bucket = grouped.get(action.columnId);
      if (bucket) {
        bucket.push(action);
      }
    }

    return {
      columns: columns.map((col) => {
        const allCards = grouped.get(col.id) ?? [];
        return {
          id: col.id,
          title: col.title,
          color: col.color,
          sortOrder: col.sortOrder,
          cards: allCards
            .slice(0, limitPerColumn)
            .map((a) => this.toActionCard(a)),
          total: allCards.length,
          hasMore: allCards.length > limitPerColumn,
        };
      }),
      activityTypes: ATTENDANCE_ACTIVITY_TYPES,
    };
  }

  async createColumn(user: JwtPayload, dto: CreateColumnDto) {
    const maxSort = await this.prisma.attendanceBoardColumn.aggregate({
      where: {
        tenantId: user.tenantId,
        ownerId: user.sub,
        deletedAt: null,
      },
      _max: { sortOrder: true },
    });

    const column = await this.prisma.attendanceBoardColumn.create({
      data: {
        tenantId: user.tenantId,
        ownerId: user.sub,
        title: dto.title.trim(),
        color: dto.color?.trim() || null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return this.toColumn(column);
  }

  async updateColumn(
    user: JwtPayload,
    columnId: string,
    dto: UpdateColumnDto,
  ) {
    const column = await this.findColumnOrThrow(user, columnId);

    const updated = await this.prisma.attendanceBoardColumn.update({
      where: { id: column.id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.color !== undefined && { color: dto.color?.trim() || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    return this.toColumn(updated);
  }

  async deleteColumn(user: JwtPayload, columnId: string) {
    const column = await this.findColumnOrThrow(user, columnId);

    const actionCount = await this.prisma.attendanceAction.count({
      where: { columnId: column.id, deletedAt: null },
    });

    if (actionCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma coluna com ações. Mova ou remova as ações primeiro.',
      );
    }

    await this.prisma.attendanceBoardColumn.update({
      where: { id: column.id },
      data: { deletedAt: new Date() },
    });

    return { ok: true };
  }

  async createAction(user: JwtPayload, dto: CreateActionDto) {
    await this.findColumnOrThrow(user, dto.columnId);
    await this.findClientOrThrow(user.tenantId, dto.clientId);

    if (dto.auctionId) {
      await this.findAuctionOrThrow(user.tenantId, dto.auctionId);
    }

    const maxSort = await this.prisma.attendanceAction.aggregate({
      where: {
        columnId: dto.columnId,
        deletedAt: null,
      },
      _max: { sortOrder: true },
    });

    const action = await this.prisma.attendanceAction.create({
      data: {
        tenantId: user.tenantId,
        ownerId: user.sub,
        columnId: dto.columnId,
        clientId: dto.clientId,
        auctionId: dto.auctionId ?? null,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: ATTENDANCE_ACTION_STATUS_OPEN,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: actionCardInclude,
    });

    return this.toActionCard(action);
  }

  async getAction(user: JwtPayload, actionId: string) {
    const action = await this.findActionOrThrow(user, actionId);

    const activities = await this.prisma.attendanceActivity.findMany({
      where: { actionId: action.id },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    });

    const full = await this.prisma.attendanceAction.findUniqueOrThrow({
      where: { id: action.id },
      include: actionCardInclude,
    });

    return {
      ...this.toActionCard(full),
      tasks: full.tasks.map((t) => this.toTask(t)),
      activities: activities.map((a) => this.toActivity(a)),
    };
  }

  async updateAction(
    user: JwtPayload,
    actionId: string,
    dto: UpdateActionDto,
  ) {
    const action = await this.findActionOrThrow(user, actionId);

    if (dto.columnId) {
      await this.findColumnOrThrow(user, dto.columnId);
    }

    if (dto.auctionId) {
      await this.findAuctionOrThrow(user.tenantId, dto.auctionId);
    }

    const isCompleting =
      dto.status === ATTENDANCE_ACTION_STATUS_DONE &&
      action.status !== ATTENDANCE_ACTION_STATUS_DONE;
    const isReopening =
      dto.status === ATTENDANCE_ACTION_STATUS_OPEN &&
      action.status === ATTENDANCE_ACTION_STATUS_DONE;

    const updated = await this.prisma.attendanceAction.update({
      where: { id: action.id },
      data: {
        ...(dto.columnId !== undefined && { columnId: dto.columnId }),
        ...(dto.auctionId !== undefined && {
          auctionId: dto.auctionId ?? null,
        }),
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(isCompleting && { completedAt: new Date() }),
        ...(isReopening && { completedAt: null }),
      },
      include: actionCardInclude,
    });

    return this.toActionCard(updated);
  }

  async deleteAction(user: JwtPayload, actionId: string) {
    const action = await this.findActionOrThrow(user, actionId);

    await this.prisma.attendanceAction.update({
      where: { id: action.id },
      data: { deletedAt: new Date() },
    });

    return { ok: true };
  }

  async createTask(
    user: JwtPayload,
    actionId: string,
    dto: CreateTaskDto,
  ) {
    const action = await this.findActionOrThrow(user, actionId);

    const maxSort = await this.prisma.attendanceActionTask.aggregate({
      where: { actionId: action.id },
      _max: { sortOrder: true },
    });

    const task = await this.prisma.attendanceActionTask.create({
      data: {
        actionId: action.id,
        title: dto.title.trim(),
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });

    return this.toTask(task);
  }

  async updateTask(
    user: JwtPayload,
    taskId: string,
    dto: UpdateTaskDto,
  ) {
    const task = await this.findTaskOrThrow(user, taskId);

    const updated = await this.prisma.attendanceActionTask.update({
      where: { id: task.id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.done !== undefined && { done: dto.done }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
      },
    });

    return this.toTask(updated);
  }

  async deleteTask(user: JwtPayload, taskId: string) {
    const task = await this.findTaskOrThrow(user, taskId);

    await this.prisma.attendanceActionTask.delete({
      where: { id: task.id },
    });

    return { ok: true };
  }

  async createActivity(
    user: JwtPayload,
    actionId: string,
    dto: CreateActivityDto,
  ) {
    const action = await this.findActionOrThrow(user, actionId);

    const activity = await this.prisma.attendanceActivity.create({
      data: {
        actionId: action.id,
        authorId: user.sub,
        type: dto.type,
        content: dto.content.trim(),
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return this.toActivity(activity);
  }

  async createActionsForAuction(
    user: JwtPayload,
    auctionId: string,
    clientIds: string[],
  ) {
    if (!clientIds.length) {
      throw new BadRequestException('Informe ao menos um cliente');
    }

    const auction = await this.findAuctionOrThrow(user.tenantId, auctionId);
    await this.ensureDefaultColumns(user);

    const firstColumn = await this.prisma.attendanceBoardColumn.findFirst({
      where: {
        tenantId: user.tenantId,
        ownerId: user.sub,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (!firstColumn) {
      throw new BadRequestException('Nenhuma coluna de atendimento disponível');
    }

    const created: AttendanceActionCard[] = [];
    const skipped: Array<{ clientId: string; actionId: string }> = [];

    for (const clientId of clientIds) {
      await this.findUserClientOrThrow(user, clientId);

      const existing = await this.prisma.attendanceAction.findFirst({
        where: {
          tenantId: user.tenantId,
          ownerId: user.sub,
          clientId,
          auctionId: auction.id,
          deletedAt: null,
          status: ATTENDANCE_ACTION_STATUS_OPEN,
        },
      });

      if (existing) {
        skipped.push({ clientId, actionId: existing.id });
        continue;
      }

      const maxSort = await this.prisma.attendanceAction.aggregate({
        where: { columnId: firstColumn.id, deletedAt: null },
        _max: { sortOrder: true },
      });

      const action = await this.prisma.attendanceAction.create({
        data: {
          tenantId: user.tenantId,
          ownerId: user.sub,
          columnId: firstColumn.id,
          clientId,
          auctionId: auction.id,
          title: `Leilão: ${auction.name}`,
          description: 'Criado a partir do match de leilão',
          status: ATTENDANCE_ACTION_STATUS_OPEN,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
          dueDate: auction.scheduledAt,
        },
        include: actionCardInclude,
      });

      created.push(this.toActionCard(action));
    }

    return {
      created,
      skipped,
      createdCount: created.length,
      skippedCount: skipped.length,
    };
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || limit <= 0) return DEFAULT_LIMIT_PER_COLUMN;
    return Math.min(limit, MAX_LIMIT_PER_COLUMN);
  }

  private async ensureDefaultColumns(user: JwtPayload) {
    const count = await this.prisma.attendanceBoardColumn.count({
      where: {
        tenantId: user.tenantId,
        ownerId: user.sub,
        deletedAt: null,
      },
    });

    if (count > 0) return;

    await this.prisma.attendanceBoardColumn.createMany({
      data: DEFAULT_BOARD_COLUMNS.map((col) => ({
        tenantId: user.tenantId,
        ownerId: user.sub,
        title: col.title,
        sortOrder: col.sortOrder,
      })),
    });
  }

  private buildActionWhere(
    user: JwtPayload,
    params: { q?: string; auctionId?: string },
  ): Prisma.AttendanceActionWhereInput {
    const clientFilters: Prisma.ClientWhereInput[] = [];

    if (params.q) {
      clientFilters.push({
        OR: [
          { name: { contains: params.q, mode: 'insensitive' } },
          { document: { contains: params.q, mode: 'insensitive' } },
          { email: { contains: params.q, mode: 'insensitive' } },
          { phone: { contains: params.q, mode: 'insensitive' } },
        ],
      });
    }

    return {
      tenantId: user.tenantId,
      ownerId: user.sub,
      deletedAt: null,
      ...(params.auctionId && { auctionId: params.auctionId }),
      ...(clientFilters.length > 0 && {
        client: { AND: clientFilters },
      }),
    };
  }

  private toColumn(column: {
    id: string;
    title: string;
    color: string | null;
    sortOrder: number;
  }) {
    return {
      id: column.id,
      title: column.title,
      color: column.color,
      sortOrder: column.sortOrder,
    };
  }

  private toActionCard(action: ActionWithRelations): AttendanceActionCard {
    const done = action.tasks.filter((t) => t.done).length;
    const total = action.tasks.length;

    return {
      id: action.id,
      columnId: action.columnId,
      title: action.title,
      description: action.description,
      status: action.status,
      sortOrder: action.sortOrder,
      dueDate: action.dueDate?.toISOString() ?? null,
      completedAt: action.completedAt?.toISOString() ?? null,
      createdAt: action.createdAt.toISOString(),
      updatedAt: action.updatedAt.toISOString(),
      client: {
        id: action.client.id,
        name: action.client.name,
        phone: action.client.phone,
        email: action.client.email,
        animalType: action.client.animalType,
        animalSex: action.client.animalSex,
        livestockCategory: action.client.livestockCategory,
        responsible: action.client.responsible,
        intentions: action.client.intentions.map((ci) => ({
          id: ci.intention.id,
          code: ci.intention.code,
          label: ci.intention.label,
        })),
      },
      auction: action.auction
        ? {
            id: action.auction.id,
            name: action.auction.name,
            scheduledAt: action.auction.scheduledAt?.toISOString() ?? null,
            status: action.auction.status,
          }
        : null,
      taskProgress: { done, total },
    };
  }

  private toTask(task: {
    id: string;
    actionId: string;
    title: string;
    done: boolean;
    sortOrder: number;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: task.id,
      actionId: task.actionId,
      title: task.title,
      done: task.done,
      sortOrder: task.sortOrder,
      dueDate: task.dueDate?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private toActivity(activity: {
    id: string;
    actionId: string;
    type: string;
    content: string;
    createdAt: Date;
    author: { id: string; name: string } | null;
  }) {
    return {
      id: activity.id,
      actionId: activity.actionId,
      type: activity.type,
      content: activity.content,
      createdAt: activity.createdAt.toISOString(),
      author: activity.author,
    };
  }

  private async findColumnOrThrow(user: JwtPayload, columnId: string) {
    const column = await this.prisma.attendanceBoardColumn.findFirst({
      where: {
        id: columnId,
        tenantId: user.tenantId,
        ownerId: user.sub,
        deletedAt: null,
      },
    });

    if (!column) {
      throw new NotFoundException('Coluna não encontrada');
    }

    return column;
  }

  private async findActionOrThrow(user: JwtPayload, actionId: string) {
    const action = await this.prisma.attendanceAction.findFirst({
      where: {
        id: actionId,
        tenantId: user.tenantId,
        ownerId: user.sub,
        deletedAt: null,
      },
    });

    if (!action) {
      throw new NotFoundException('Ação não encontrada');
    }

    return action;
  }

  private async findTaskOrThrow(user: JwtPayload, taskId: string) {
    const task = await this.prisma.attendanceActionTask.findFirst({
      where: {
        id: taskId,
        action: {
          tenantId: user.tenantId,
          ownerId: user.sub,
          deletedAt: null,
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    return task;
  }

  private async findUserClientOrThrow(user: JwtPayload, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId: user.tenantId,
        deletedAt: null,
        active: true,
        isDefault: false,
        responsible: {
          userId: user.sub,
          deletedAt: null,
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado na sua carteira');
    }

    return client;
  }

  private async findClientOrThrow(tenantId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, deletedAt: null },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return client;
  }

  private async findAuctionOrThrow(tenantId: string, auctionId: string) {
    const auction = await this.prisma.auction.findFirst({
      where: { id: auctionId, tenantId, deletedAt: null },
    });

    if (!auction) {
      throw new NotFoundException('Leilão não encontrado');
    }

    return auction;
  }
}

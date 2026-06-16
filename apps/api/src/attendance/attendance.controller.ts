import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../auth/auth.types';
import { AttendanceService } from './attendance.service';
import { CreateActionDto } from './dto/create-action.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('board')
  getBoard(
    @CurrentUser() user: JwtPayload,
    @Query('q') q?: string,
    @Query('auctionId') auctionId?: string,
    @Query('limitPerColumn') limitPerColumn?: string,
  ) {
    return this.attendanceService.getBoard(user, {
      q,
      auctionId,
      limitPerColumn: limitPerColumn ? Number(limitPerColumn) : undefined,
    });
  }

  @Post('columns')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  createColumn(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateColumnDto,
  ) {
    return this.attendanceService.createColumn(user, dto);
  }

  @Patch('columns/:columnId')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  updateColumn(
    @CurrentUser() user: JwtPayload,
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.attendanceService.updateColumn(user, columnId, dto);
  }

  @Delete('columns/:columnId')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  deleteColumn(
    @CurrentUser() user: JwtPayload,
    @Param('columnId', ParseUUIDPipe) columnId: string,
  ) {
    return this.attendanceService.deleteColumn(user, columnId);
  }

  @Post('actions')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  createAction(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateActionDto,
  ) {
    return this.attendanceService.createAction(user, dto);
  }

  @Get('actions/:actionId')
  getAction(
    @CurrentUser() user: JwtPayload,
    @Param('actionId', ParseUUIDPipe) actionId: string,
  ) {
    return this.attendanceService.getAction(user, actionId);
  }

  @Patch('actions/:actionId')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  updateAction(
    @CurrentUser() user: JwtPayload,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    @Body() dto: UpdateActionDto,
  ) {
    return this.attendanceService.updateAction(user, actionId, dto);
  }

  @Delete('actions/:actionId')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  deleteAction(
    @CurrentUser() user: JwtPayload,
    @Param('actionId', ParseUUIDPipe) actionId: string,
  ) {
    return this.attendanceService.deleteAction(user, actionId);
  }

  @Post('actions/:actionId/tasks')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  createTask(
    @CurrentUser() user: JwtPayload,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.attendanceService.createTask(user, actionId, dto);
  }

  @Patch('tasks/:taskId')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  updateTask(
    @CurrentUser() user: JwtPayload,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.attendanceService.updateTask(user, taskId, dto);
  }

  @Delete('tasks/:taskId')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  deleteTask(
    @CurrentUser() user: JwtPayload,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.attendanceService.deleteTask(user, taskId);
  }

  @Post('actions/:actionId/activities')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  createActivity(
    @CurrentUser() user: JwtPayload,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.attendanceService.createActivity(user, actionId, dto);
  }
}

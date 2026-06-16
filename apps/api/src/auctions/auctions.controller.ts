import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TenantRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../auth/auth.types';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { CreateAuctionAttendanceDto } from './dto/create-auction-attendance.dto';
import { ImportScheduleDto } from './dto/import-schedule.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { UpsertAuctionMatchDto } from './dto/upsert-auction-match.dto';

@Controller('auctions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.auctionsService.list(user);
  }

  @Post()
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAuctionDto) {
    return this.auctionsService.create(user, dto);
  }

  @Post('import/parse')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  parseImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatório');
    }
    return this.auctionsService.parseImport(file.buffer, file.originalname);
  }

  @Post('import/commit')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  commitImport(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.auctionsService.commitImport(user, body);
  }

  @Get('schedule')
  getSchedule(@CurrentUser() user: JwtPayload) {
    return this.auctionsService.getSchedule(user);
  }

  @Post('schedule/import')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  importSchedule(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ImportScheduleDto,
  ) {
    return this.auctionsService.importSchedule(user, dto);
  }

  @Get(':id/matches')
  getMatches(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('q') q?: string,
  ) {
    return this.auctionsService.getMatches(user, id, q);
  }

  @Post(':id/matches')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  upsertMatch(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertAuctionMatchDto,
  ) {
    return this.auctionsService.upsertMatch(user, id, dto);
  }

  @Delete(':id/matches/:clientId')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  removeMatch(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.auctionsService.removeMatch(user, id, clientId);
  }

  @Post(':id/attendance')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  createAttendanceFromMatch(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAuctionAttendanceDto,
  ) {
    return this.auctionsService.createAttendanceFromMatch(user, id, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.auctionsService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAuctionDto,
  ) {
    return this.auctionsService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.auctionsService.remove(user, id);
  }
}

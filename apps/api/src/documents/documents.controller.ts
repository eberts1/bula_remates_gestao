import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TenantRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../auth/auth.types';
import { DocumentsService } from './documents.service';
import { UploadUrlDto } from './dto/upload-url.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('clientId') clientId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentsService.list(
      user,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      clientId,
    );
  }

  @Post('upload-url')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  createUploadUrl(@CurrentUser() user: JwtPayload, @Body() dto: UploadUrlDto) {
    return this.documentsService.createUploadUrl(user, dto);
  }

  @Post(':id/complete')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  complete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.completeUpload(user, id);
  }

  @Get(':id/download-url')
  getDownloadUrl(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.getDownloadUrl(user, id);
  }

  @Delete(':id')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.remove(user, id);
  }
}

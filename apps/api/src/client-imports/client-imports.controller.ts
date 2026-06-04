import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../auth/auth.types';
import { ClientImportsService } from './client-imports.service';

@Controller('clients/import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientImportsController {
  constructor(private readonly importsService: ClientImportsService) {}

  @Post('parse')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  parse(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body('sourceHints') sourceHints?: string,
    @Body('columnMapping') columnMapping?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatório');
    }
    return this.importsService.parseFile(user, file, sourceHints, columnMapping);
  }

  @Post('commit')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  commit(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.importsService.commit(user, body);
  }
}

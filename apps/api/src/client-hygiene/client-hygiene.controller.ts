import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { TenantRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../auth/auth.types';
import { ClientHygieneService } from './client-hygiene.service';
import { BulkTagsDto } from './dto/bulk-tags.dto';

@Controller('client-hygiene')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientHygieneController {
  constructor(private readonly service: ClientHygieneService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('issue') issue?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user, {
      issue,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('summary')
  summary(@CurrentUser() user: JwtPayload) {
    return this.service.summary(user);
  }

  @Patch('bulk-tags')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  bulkTags(@CurrentUser() user: JwtPayload, @Body() dto: BulkTagsDto) {
    return this.service.bulkTags(user, dto);
  }
}

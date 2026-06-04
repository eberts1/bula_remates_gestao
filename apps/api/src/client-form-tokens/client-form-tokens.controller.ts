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
import { ClientFormTokenType, TenantRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../auth/auth.types';
import { ClientFormTokensService } from './client-form-tokens.service';
import { CreateFormTokenDto } from './dto/create-form-token.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientFormTokensController {
  constructor(private readonly tokensService: ClientFormTokensService) {}

  @Post('client-form-tokens')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  createShared(@CurrentUser() user: JwtPayload, @Body() dto: CreateFormTokenDto) {
    return this.tokensService.create(user, dto);
  }

  @Post('clients/:id/client-form-tokens')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  createForClient(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFormTokenDto,
  ) {
    return this.tokensService.create(
      user,
      { ...dto, type: ClientFormTokenType.edit },
      id,
    );
  }

  @Get('client-form-tokens')
  list(
    @CurrentUser() user: JwtPayload,
    @Query('clientId') clientId?: string,
  ) {
    return this.tokensService.list(user, clientId);
  }

  @Delete('client-form-tokens/:id')
  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)
  revoke(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tokensService.revoke(user, id);
  }
}

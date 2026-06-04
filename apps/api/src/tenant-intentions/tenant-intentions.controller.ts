import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.types';
import { TenantIntentionsService } from './tenant-intentions.service';

@Controller('tenant-intentions')
@UseGuards(JwtAuthGuard)
export class TenantIntentionsController {
  constructor(private readonly service: TenantIntentionsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.tenantId);
  }
}

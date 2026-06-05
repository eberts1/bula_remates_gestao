import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../auth/auth.types';
import { ClientAnalyticsService } from './client-analytics.service';

@Controller('client-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientAnalyticsController {
  constructor(private readonly service: ClientAnalyticsService) {}

  @Get('overview')
  overview(@CurrentUser() user: JwtPayload) {
    return this.service.overview(user);
  }
}

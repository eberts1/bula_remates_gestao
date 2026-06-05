import { Module } from '@nestjs/common';
import { GeoModule } from '../geo/geo.module';
import { ClientAnalyticsController } from './client-analytics.controller';
import { ClientAnalyticsService } from './client-analytics.service';

@Module({
  imports: [GeoModule],
  controllers: [ClientAnalyticsController],
  providers: [ClientAnalyticsService],
})
export class ClientAnalyticsModule {}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GeoService } from './geo.service';

@Controller('geo')
@UseGuards(JwtAuthGuard)
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get('cities')
  cities(@Query('state') state?: string, @Query('q') q?: string) {
    if (!state) return { items: [] };
    return { items: this.geo.searchCities(state, q) };
  }
}

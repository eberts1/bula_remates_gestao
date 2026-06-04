import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { GeoModule } from '../geo/geo.module';
import { ClientHygieneController } from './client-hygiene.controller';
import { ClientHygieneService } from './client-hygiene.service';

@Module({
  imports: [ClientsModule, GeoModule],
  controllers: [ClientHygieneController],
  providers: [ClientHygieneService],
})
export class ClientHygieneModule {}

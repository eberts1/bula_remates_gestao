import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { ClientImportsController } from './client-imports.controller';
import { ClientImportsService } from './client-imports.service';

@Module({
  imports: [ClientsModule],
  controllers: [ClientImportsController],
  providers: [ClientImportsService],
})
export class ClientImportsModule {}

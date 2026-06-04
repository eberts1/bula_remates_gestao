import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { DocumentsModule } from '../documents/documents.module';
import { PublicRegistrationController } from './public-registration.controller';
import { PublicRegistrationService } from './public-registration.service';

@Module({
  imports: [ClientsModule, DocumentsModule],
  controllers: [PublicRegistrationController],
  providers: [PublicRegistrationService],
})
export class PublicRegistrationModule {}

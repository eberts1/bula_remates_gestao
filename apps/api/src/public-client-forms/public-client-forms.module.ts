import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { DocumentsModule } from '../documents/documents.module';
import { PublicClientFormsController } from './public-client-forms.controller';
import { PublicClientFormsService } from './public-client-forms.service';

@Module({
  imports: [ClientsModule, DocumentsModule],
  controllers: [PublicClientFormsController],
  providers: [PublicClientFormsService],
})
export class PublicClientFormsModule {}

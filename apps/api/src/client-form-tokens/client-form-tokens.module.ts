import { Module } from '@nestjs/common';
import { ClientFormTokensController } from './client-form-tokens.controller';
import { ClientFormTokensService } from './client-form-tokens.service';

@Module({
  controllers: [ClientFormTokensController],
  providers: [ClientFormTokensService],
  exports: [ClientFormTokensService],
})
export class ClientFormTokensModule {}

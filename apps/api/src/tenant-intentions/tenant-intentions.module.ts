import { Module } from '@nestjs/common';
import { TenantIntentionsController } from './tenant-intentions.controller';
import { TenantIntentionsService } from './tenant-intentions.service';

@Module({
  controllers: [TenantIntentionsController],
  providers: [TenantIntentionsService],
  exports: [TenantIntentionsService],
})
export class TenantIntentionsModule {}

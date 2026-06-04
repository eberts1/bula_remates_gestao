import { Global, Module } from '@nestjs/common';
import { RedisThrottlerStorage } from '../common/redis-throttler.storage';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService, RedisThrottlerStorage],
  exports: [RedisService, RedisThrottlerStorage],
})
export class RedisModule {}

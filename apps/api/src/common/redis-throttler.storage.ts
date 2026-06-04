import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `rl:${throttlerName}:${key}`;
    const client = this.redis.getClient();
    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.pexpire(redisKey, ttl);
    }
    const ttlRemaining = await client.pttl(redisKey);
    const isBlocked = count > limit;
    return {
      totalHits: count,
      timeToExpire: Math.max(ttlRemaining, 0),
      isBlocked,
      timeToBlockExpire: isBlocked ? blockDuration : 0,
    };
  }
}

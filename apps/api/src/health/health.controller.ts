import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    let db = 'ok';
    let redis = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'error';
    }

    try {
      await this.redis.getClient().ping();
    } catch {
      redis = 'error';
    }

    const status = db === 'ok' && redis === 'ok' ? 'ok' : 'degraded';
    return { status, db, redis, timestamp: new Date().toISOString() };
  }
}

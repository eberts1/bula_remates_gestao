import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { seedTenantIntentions } from '../common/tenant-intentions.util';

@Injectable()
export class TenantIntentionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    let items = await this.prisma.tenantIntention.findMany({
      where: { tenantId, active: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (items.length === 0) {
      await this.prisma.$transaction(async (tx) => {
        await seedTenantIntentions(tx, tenantId);
      });
      items = await this.prisma.tenantIntention.findMany({
        where: { tenantId, active: true },
        orderBy: { sortOrder: 'asc' },
      });
    }

    return {
      items: items.map((i) => ({
        id: i.id,
        code: i.code,
        label: i.label,
        sortOrder: i.sortOrder,
      })),
    };
  }
}

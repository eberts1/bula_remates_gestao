import { Injectable } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStorageUsage(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });

    const used = await this.prisma.document.aggregate({
      where: {
        tenantId,
        status: DocumentStatus.ready,
        deletedAt: null,
      },
      _sum: { sizeBytes: true },
      _count: true,
    });

    return {
      quotaBytes: Number(tenant.storageQuotaBytes),
      usedBytes: Number(used._sum.sizeBytes ?? 0n),
      documentCount: used._count,
    };
  }
}

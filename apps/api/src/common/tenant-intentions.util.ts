import { DEFAULT_TENANT_INTENTIONS } from '@docs/shared';
import { Prisma } from '@prisma/client';

export async function seedTenantIntentions(
  tx: Prisma.TransactionClient,
  tenantId: string,
) {
  await tx.tenantIntention.createMany({
    data: DEFAULT_TENANT_INTENTIONS.map((i) => ({
      tenantId,
      code: i.code,
      label: i.label,
      sortOrder: i.sortOrder,
    })),
    skipDuplicates: true,
  });
}

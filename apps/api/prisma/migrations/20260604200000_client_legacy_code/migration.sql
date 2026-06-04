-- AlterTable
ALTER TABLE "clients" ADD COLUMN "legacy_code" TEXT;

-- CreateIndex
CREATE INDEX "clients_tenant_id_legacy_code_idx" ON "clients"("tenant_id", "legacy_code");

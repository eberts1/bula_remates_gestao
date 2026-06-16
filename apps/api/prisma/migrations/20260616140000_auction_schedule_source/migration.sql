-- AlterTable
ALTER TABLE "auctions" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "auctions" ADD COLUMN "external_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "auctions_tenant_id_external_key_key" ON "auctions"("tenant_id", "external_key");

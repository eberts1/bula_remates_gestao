-- CreateEnum
CREATE TYPE "ClientExportPurpose" AS ENUM ('message_dispatcher', 'requested_listing', 'internal', 'other');

-- CreateTable
CREATE TABLE "client_export_batches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "purpose" "ClientExportPurpose" NOT NULL,
    "destination" TEXT,
    "recipient_name" TEXT,
    "notes" TEXT,
    "client_count" INTEGER NOT NULL,
    "filters" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_export_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_export_batches_tenant_id_created_at_idx" ON "client_export_batches"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "client_export_batches_tenant_id_purpose_idx" ON "client_export_batches"("tenant_id", "purpose");

-- AddForeignKey
ALTER TABLE "client_export_batches" ADD CONSTRAINT "client_export_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_export_batches" ADD CONSTRAINT "client_export_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

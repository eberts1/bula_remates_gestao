-- AlterTable
ALTER TABLE "clients" ADD COLUMN "animal_type" TEXT,
ADD COLUMN "animal_sex" TEXT,
ADD COLUMN "livestock_category" TEXT,
ADD COLUMN "intention_notes" TEXT;

-- CreateTable
CREATE TABLE "tenant_intentions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_intentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_intentions" (
    "client_id" UUID NOT NULL,
    "intention_id" UUID NOT NULL,

    CONSTRAINT "client_intentions_pkey" PRIMARY KEY ("client_id","intention_id")
);

-- CreateTable
CREATE TABLE "client_import_batches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "imported_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_tenant_id_animal_type_idx" ON "clients"("tenant_id", "animal_type");
CREATE INDEX "clients_tenant_id_animal_sex_idx" ON "clients"("tenant_id", "animal_sex");
CREATE INDEX "clients_tenant_id_livestock_category_idx" ON "clients"("tenant_id", "livestock_category");

CREATE UNIQUE INDEX "tenant_intentions_tenant_id_code_key" ON "tenant_intentions"("tenant_id", "code");
CREATE INDEX "tenant_intentions_tenant_id_sort_order_idx" ON "tenant_intentions"("tenant_id", "sort_order");

CREATE INDEX "client_import_batches_tenant_id_created_at_idx" ON "client_import_batches"("tenant_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "tenant_intentions" ADD CONSTRAINT "tenant_intentions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_intentions" ADD CONSTRAINT "client_intentions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_intentions" ADD CONSTRAINT "client_intentions_intention_id_fkey" FOREIGN KEY ("intention_id") REFERENCES "tenant_intentions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_import_batches" ADD CONSTRAINT "client_import_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_import_batches" ADD CONSTRAINT "client_import_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default intentions for existing tenants
INSERT INTO "tenant_intentions" ("id", "tenant_id", "code", "label", "sort_order", "active", "created_at", "updated_at")
SELECT gen_random_uuid(), t.id, v.code, v.label, v.sort_order, true, NOW(), NOW()
FROM "tenants" t
CROSS JOIN (VALUES
  ('comprador', 'Comprador', 0),
  ('vendedor', 'Vendedor', 1),
  ('prospect', 'Prospect', 2),
  ('inativo', 'Inativo', 3)
) AS v(code, label, sort_order);

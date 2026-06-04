-- CreateEnum
CREATE TYPE "ClientFormTokenType" AS ENUM ('create', 'edit');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "address_full" TEXT,
ALTER COLUMN "document" DROP NOT NULL;

-- CreateTable
CREATE TABLE "client_properties" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "farm_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "route_notes" TEXT,
    "phone" TEXT,
    "ie" TEXT,
    "nirf" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_form_tokens" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" "ClientFormTokenType" NOT NULL,
    "client_id" UUID,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_form_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_properties_client_id_sort_order_idx" ON "client_properties"("client_id", "sort_order");

-- CreateIndex
CREATE INDEX "client_properties_tenant_id_idx" ON "client_properties"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_form_tokens_token_hash_key" ON "client_form_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "client_form_tokens_tenant_id_type_idx" ON "client_form_tokens"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "client_form_tokens_client_id_idx" ON "client_form_tokens"("client_id");

-- AddForeignKey
ALTER TABLE "client_properties" ADD CONSTRAINT "client_properties_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_properties" ADD CONSTRAINT "client_properties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_form_tokens" ADD CONSTRAINT "client_form_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_form_tokens" ADD CONSTRAINT "client_form_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_form_tokens" ADD CONSTRAINT "client_form_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

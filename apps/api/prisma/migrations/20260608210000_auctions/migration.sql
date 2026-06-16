-- CreateTable
CREATE TABLE "auctions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'agendado',
    "animal_type" TEXT,
    "animal_sex" TEXT,
    "livestock_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_intention_code" TEXT,
    "offers_notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_matches" (
    "auction_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_matches_pkey" PRIMARY KEY ("auction_id","client_id")
);

-- CreateIndex
CREATE INDEX "auctions_tenant_id_scheduled_at_idx" ON "auctions"("tenant_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "auctions_tenant_id_status_idx" ON "auctions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "auctions_tenant_id_deleted_at_idx" ON "auctions"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "auction_matches_client_id_idx" ON "auction_matches"("client_id");

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_matches" ADD CONSTRAINT "auction_matches_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_matches" ADD CONSTRAINT "auction_matches_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

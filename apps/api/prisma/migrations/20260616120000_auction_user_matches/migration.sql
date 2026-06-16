-- Agenda global; matches e contagem por usuario logado
ALTER TABLE "auctions" ADD COLUMN "is_bula_remates" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "auction_matches" ADD COLUMN "owner_id" UUID;
ALTER TABLE "auction_matches" ADD COLUMN "notes" TEXT;

DELETE FROM "auction_matches";

ALTER TABLE "auction_matches" ALTER COLUMN "owner_id" SET NOT NULL;

ALTER TABLE "auction_matches" DROP CONSTRAINT "auction_matches_pkey";
ALTER TABLE "auction_matches" ADD CONSTRAINT "auction_matches_pkey" PRIMARY KEY ("auction_id", "client_id", "owner_id");

CREATE INDEX "auction_matches_owner_id_idx" ON "auction_matches"("owner_id");

ALTER TABLE "auction_matches" ADD CONSTRAINT "auction_matches_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add owner_id to clients for per-user data isolation
ALTER TABLE "clients" ADD COLUMN "owner_id" UUID;

-- Backfill: assign existing clients to super admin of each tenant
UPDATE "clients" c
SET "owner_id" = (
  SELECT tm."user_id"
  FROM "tenant_members" tm
  JOIN "users" u ON u."id" = tm."user_id"
  WHERE tm."tenant_id" = c."tenant_id"
    AND u."is_super_admin" = true
  ORDER BY tm."joined_at" ASC
  LIMIT 1
);

-- Fallback: assign to tenant owner when no super admin exists
UPDATE "clients" c
SET "owner_id" = (
  SELECT tm."user_id"
  FROM "tenant_members" tm
  WHERE tm."tenant_id" = c."tenant_id"
  ORDER BY (tm."role" = 'owner') DESC, tm."joined_at" ASC
  LIMIT 1
)
WHERE c."owner_id" IS NULL;

CREATE INDEX "clients_tenant_id_owner_id_idx" ON "clients"("tenant_id", "owner_id");

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

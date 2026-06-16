-- AlterTable
ALTER TABLE "clients" ADD COLUMN "attendance_stage" TEXT,
ADD COLUMN "attendance_checklist" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "attendance_finalized_at" TIMESTAMP(3),
ADD COLUMN "attendance_updated_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "clients_tenant_id_attendance_stage_idx" ON "clients"("tenant_id", "attendance_stage");

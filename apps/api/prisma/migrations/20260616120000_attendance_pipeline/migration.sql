-- CreateTable
CREATE TABLE "attendance_board_columns" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attendance_board_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_actions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "column_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "auction_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attendance_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_action_tasks" (
    "id" UUID NOT NULL,
    "action_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_action_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_activities" (
    "id" UUID NOT NULL,
    "action_id" UUID NOT NULL,
    "author_id" UUID,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_board_columns_tenant_id_owner_id_sort_order_idx" ON "attendance_board_columns"("tenant_id", "owner_id", "sort_order");

-- CreateIndex
CREATE INDEX "attendance_actions_tenant_id_owner_id_column_id_sort_order_idx" ON "attendance_actions"("tenant_id", "owner_id", "column_id", "sort_order");

-- CreateIndex
CREATE INDEX "attendance_actions_client_id_idx" ON "attendance_actions"("client_id");

-- CreateIndex
CREATE INDEX "attendance_actions_auction_id_idx" ON "attendance_actions"("auction_id");

-- CreateIndex
CREATE INDEX "attendance_action_tasks_action_id_sort_order_idx" ON "attendance_action_tasks"("action_id", "sort_order");

-- CreateIndex
CREATE INDEX "attendance_activities_action_id_created_at_idx" ON "attendance_activities"("action_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "attendance_board_columns" ADD CONSTRAINT "attendance_board_columns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_board_columns" ADD CONSTRAINT "attendance_board_columns_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_actions" ADD CONSTRAINT "attendance_actions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_actions" ADD CONSTRAINT "attendance_actions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_actions" ADD CONSTRAINT "attendance_actions_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "attendance_board_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_actions" ADD CONSTRAINT "attendance_actions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_actions" ADD CONSTRAINT "attendance_actions_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_action_tasks" ADD CONSTRAINT "attendance_action_tasks_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "attendance_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_activities" ADD CONSTRAINT "attendance_activities_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "attendance_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_activities" ADD CONSTRAINT "attendance_activities_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

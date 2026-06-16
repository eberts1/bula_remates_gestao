-- Índices compostos para filtros frequentes (tenant + soft-delete, login, intenção, UF)

-- CreateIndex
CREATE INDEX "clients_tenant_id_deleted_at_idx" ON "clients"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "tenant_members_user_id_idx" ON "tenant_members"("user_id");

-- CreateIndex
CREATE INDEX "client_intentions_intention_id_idx" ON "client_intentions"("intention_id");

-- CreateIndex
CREATE INDEX "client_properties_tenant_id_state_idx" ON "client_properties"("tenant_id", "state");

-- Índice parcial: clientes ativos e não-padrão por tenant (higiene, analytics, mapa)
CREATE INDEX "clients_tenant_id_active_non_default_idx" ON "clients"("tenant_id")
  WHERE "deleted_at" IS NULL AND "is_default" = false;

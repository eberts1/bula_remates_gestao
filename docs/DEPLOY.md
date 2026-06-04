# Guia de deploy MVP

> **Checklist passo a passo (marcar item a item):** [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)

## Arquitetura em produção

```
[Vercel - Next.js]  →  BFF /api/*  →  [Railway/Render - NestJS]
                                              ↓
                         [Neon - PostgreSQL] [Upstash - Redis] [GCS - arquivos]
```

## 1. PostgreSQL (Neon)

1. Crie um projeto em https://neon.tech
2. Copie a connection string (`postgresql://...`)
3. Use como `DATABASE_URL` na API

```bash
cd apps/api
DATABASE_URL="..." pnpm exec prisma migrate deploy
```

## 2. Redis (Upstash)

1. Crie database em https://upstash.com
2. Use a URL `rediss://...` como `REDIS_URL`

## 3. Google Cloud Storage

1. Console GCP → Storage → Criar bucket
2. IAM → Service Account → Criar chave JSON
3. Papel: Storage Object Admin no bucket
4. Configure CORS (ver README principal)
5. Variáveis na API:
   - `STORAGE_MODE=gcs`
   - `GCS_BUCKET`
   - `GCS_PROJECT_ID`
   - `GOOGLE_APPLICATION_CREDENTIALS` (caminho do JSON no container) ou injete JSON via secret

## 4. API (Railway exemplo)

1. Conecte o repositório
2. Root directory: `apps/api`
3. Build: `pnpm install && pnpm build`
4. Start: `node dist/main`
5. Configure todas as env vars do `.env.example`
6. `WEB_URL` = URL final da Vercel

## 5. Web (Vercel)

1. Importe o monorepo
2. Root Directory: `apps/web`
3. Framework: Next.js
4. Env:
   - `API_URL` = URL pública da API
   - `NEXT_PUBLIC_API_URL` = mesma URL

## 6. Pós-deploy

- Teste `GET /health` na API
- Registre uma empresa em `/register`
- Faça upload de um PDF de teste
- Verifique objeto no bucket GCS em `tenants/{tenantId}/documents/...`

## Troubleshooting

| Problema | Solução |
|----------|---------|
| CORS no upload GCS | Adicione origem da Vercel no CORS do bucket |
| Cookie não persiste | `WEB_URL` na API deve bater com domínio do front |
| 403 quota | Aumente `storage_quota_bytes` no tenant ou exclua docs |
| Refresh falha | Confirme `REDIS_URL` e TTL do refresh |

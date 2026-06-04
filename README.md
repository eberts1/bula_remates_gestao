# Docs Bula Remates

Sistema multi-usuário para armazenamento de documentos por empresa (tenant).

## Stack

- **Frontend:** Next.js 15 (App Router) + BFF em Route Handlers
- **Backend:** NestJS + Prisma
- **Banco:** PostgreSQL 16
- **Cache/sessões:** Redis 7
- **Arquivos:** Google Cloud Storage (produção) ou disco local (desenvolvimento)

## Estrutura

```
apps/api     → API NestJS (porta 4000)
apps/web     → Next.js (porta 3000)
packages/shared → tipos e schemas Zod compartilhados
```

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker (PostgreSQL e Redis)

## Setup local

### 1. Infraestrutura

```bash
docker compose up -d
```

### 2. Variáveis de ambiente

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edite `apps/api/.env` e defina segredos JWT com pelo menos 32 caracteres.

### 3. Instalar dependências

```bash
pnpm install
```

### 4. Banco de dados

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Executar em desenvolvimento

```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- Health: http://localhost:4000/health

### Modo storage local (padrão)

Com `STORAGE_MODE=local`, os arquivos ficam em `apps/api/uploads`. O upload usa endpoints proxy da API (`/storage/local-upload`).

### Modo GCS (produção)

```env
STORAGE_MODE=gcs
GCS_BUCKET=seu-bucket
GCS_PROJECT_ID=seu-projeto
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

#### Checklist IAM GCS

1. Criar bucket com **uniform bucket-level access**
2. Service account com papéis:
   - `roles/storage.objectAdmin` (ou mais restrito: Creator + Viewer no bucket)
3. CORS no bucket (upload direto do browser):

```json
[
  {
    "origin": ["http://localhost:3000", "https://seu-dominio.vercel.app"],
    "method": ["GET", "PUT", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
```

## Fluxo de upload

1. `POST /documents/upload-url` → cria draft + signed URL
2. Browser `PUT` no GCS (ou local-upload)
3. `POST /documents/:id/complete` → valida objeto e marca `ready`
4. `GET /documents/:id/download-url` → signed URL de download

## Papéis (RBAC)

| Papel   | Upload | Download | Excluir |
|---------|--------|----------|---------|
| owner   | sim    | sim      | sim     |
| admin   | sim    | sim      | sim     |
| member  | sim    | sim      | sim     |
| viewer  | não    | sim      | não     |

## Deploy MVP (staging/produção)

### Componentes recomendados

| Serviço   | Sugestão        |
|-----------|-----------------|
| Web       | Vercel          |
| API       | Railway / Render / Fly.io / Cloud Run |
| Postgres  | Neon ou Supabase |
| Redis     | Upstash         |
| Arquivos  | GCS             |

### Variáveis — API (hosting)

```
DATABASE_URL=postgresql://...
REDIS_URL=rediss://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
STORAGE_MODE=gcs
GCS_BUCKET=...
GCS_PROJECT_ID=...
WEB_URL=https://seu-app.vercel.app
API_URL=https://sua-api.railway.app
NODE_ENV=production
```

### Variáveis — Web (Vercel)

```
API_URL=https://sua-api.railway.app
NEXT_PUBLIC_API_URL=https://sua-api.railway.app
```

### Ordem de deploy

1. Subir Postgres e Redis gerenciados
2. Rodar migrations: `pnpm db:migrate` (com `DATABASE_URL` de produção)
3. Deploy da API com `STORAGE_MODE=gcs` e credenciais GCP
4. Configurar CORS no GCS com URL da Vercel
5. Deploy do Next na Vercel apontando `API_URL` para a API

### Build de produção

```bash
pnpm build
```

## Scripts

| Comando           | Descrição                    |
|-------------------|------------------------------|
| `pnpm dev`        | API + Web em modo watch      |
| `pnpm build`      | Build de todos os pacotes    |
| `pnpm db:migrate` | Migrations Prisma            |
| `pnpm db:generate`| Gera Prisma Client           |

## Segurança

- Access token JWT (15 min) em cookie httpOnly no domínio web
- Refresh token em Redis + cookie httpOnly
- Rate limit global via Redis (100 req/min)
- Quota de armazenamento por tenant (padrão 10 GB)
- Soft delete de documentos

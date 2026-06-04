# Checklist de deploy — Docs Bula Remates

Use este documento na ordem. Marque cada item conforme concluir.

**Arquitetura alvo**

```
[Vercel — apps/web]  →  BFF /api/*  →  [Railway/Render — apps/api]
                                              ↓
                    [Neon — Postgres]  [Upstash — Redis]  [GCS — arquivos]
```

**Repositório:** https://github.com/eberts1/bula_remates_gestao

---

## Fase 0 — Antes de começar

- [ ] Código no GitHub na branch `main` (já feito se o repo está atualizado)
- [ ] Conta **Neon** (Postgres): https://neon.tech
- [ ] Conta **Upstash** (Redis): https://upstash.com
- [ ] Conta **Google Cloud** com billing ativo (GCS)
- [ ] Conta **Railway** ou **Render** (API NestJS)
- [ ] Conta **Vercel** (frontend Next.js)
- [ ] Gerador de segredos (ex.: `openssl rand -base64 32` ou site de password manager)

---

## Fase 1 — PostgreSQL (Neon)

### Criar banco

- [ ] Novo projeto no Neon (região próxima dos usuários, ex. `sa-east-1` se disponível)
- [ ] Copiar **connection string** (formato `postgresql://user:pass@host/db?sslmode=require`)
- [ ] Guardar em local seguro — será `DATABASE_URL` na API

### Migrations (rodar **uma vez** após a API ter acesso ao banco)

No seu PC, na pasta do projeto:

```bash
cd apps/api
set DATABASE_URL=postgresql://...   # Windows CMD
# ou $env:DATABASE_URL="..."         # PowerShell
pnpm exec prisma migrate deploy
```

- [ ] Comando `migrate deploy` terminou sem erro
- [ ] (Opcional) Conferir tabelas no console do Neon

| Variável (API) | Valor |
|----------------|--------|
| `DATABASE_URL` | Connection string completa do Neon |

---

## Fase 2 — Redis (Upstash)

- [ ] Criar database Redis no Upstash
- [ ] Copiar URL (preferir `rediss://...` com TLS)
- [ ] Testar conexão se o painel oferecer “Ping”

| Variável (API) | Valor |
|----------------|--------|
| `REDIS_URL` | URL `rediss://...` do Upstash |

---

## Fase 3 — Google Cloud Storage (GCS)

> Guia detalhado (bucket `bula_remates_gestao`, **sem** chave HMAC): [GCS_SETUP.md](./GCS_SETUP.md)

### Bucket

- [ ] Bucket **`bula_remates_gestao`** criado — [console](https://console.cloud.google.com/storage/browser/bula_remates_gestao)
- [ ] **Uniform bucket-level access** ativado
- [ ] Região definida

### Service account (use JSON, não HMAC de Interoperabilidade)

- [ ] IAM → Service Accounts → **Criar** (`bula-remates-api`)
- [ ] Papel no bucket: `Storage Object Admin` (ou Creator + Viewer só nesse bucket)
- [ ] Baixar chave **JSON** (guardar como secret — nunca commitar)
- [ ] **Não** usar chave HMAC da conta de usuário (Configurações → Interoperabilidade)

### CORS no bucket

Substitua `https://SEU-APP.vercel.app` pela URL final da Vercel (sem barra no final):

```json
[
  {
    "origin": ["http://localhost:3000", "https://SEU-APP.vercel.app"],
    "method": ["GET", "PUT", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
```

- [ ] CORS aplicado no bucket (Console → bucket → Configuration → CORS)

### Credenciais na API

- [ ] Railway: variável `GCP_SERVICE_ACCOUNT_JSON` = conteúdo do JSON em **uma linha**
- [ ] Ou local: `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json`

| Variável (API) | Valor |
|----------------|--------|
| `STORAGE_MODE` | `gcs` |
| `GCS_BUCKET` | `bula_remates_gestao` |
| `GCS_PROJECT_ID` | ID do projeto (IAM → Configurações) |
| `GCP_SERVICE_ACCOUNT_JSON` | JSON da service account (Railway) |

---

## Fase 4 — API NestJS (Railway ou Render)

> **Não use Vercel para a API.** Root directory: `apps/api`.

### Criar serviço

- [ ] Conectar repositório `eberts1/bula_remates_gestao`
- [ ] **Root Directory:** `apps/api`
- [ ] **Branch:** `main`

### Build e start (exemplo Railway)

| Campo | Valor sugerido |
|--------|----------------|
| Install | `pnpm install` (na raiz do monorepo — se falhar, root do repo = `.` e comando `cd apps/api && ...` conforme o host) |
| Build | `pnpm build` ou `nest build` |
| Start | `node dist/main.js` ou `pnpm start` |

> Em monorepo pnpm: muitas vezes o **root do serviço** no Railway é a **raiz do repo** com **Start Command** `cd apps/api && node dist/main.js` após build em `apps/api`. Ajuste conforme o wizard do host.

- [ ] Build passou
- [ ] Serviço “Running”
- [ ] URL pública gerada (ex. `https://bula-remates-api.up.railway.app`)

### Variáveis de ambiente — API (copiar e preencher)

Gere dois segredos diferentes (mín. 32 caracteres):

```bash
# Exemplo (Git Bash / WSL / Mac)
openssl rand -base64 32
```

| Variável | Obrigatório | Exemplo / nota |
|----------|:-----------:|----------------|
| `DATABASE_URL` | sim | `postgresql://...@neon.tech/...?sslmode=require` |
| `REDIS_URL` | sim | `rediss://default:xxx@xxx.upstash.io:6379` |
| `PORT` | sim* | Host costuma injetar; se não, `4000` |
| `NODE_ENV` | sim | `production` |
| `API_URL` | sim | URL pública da API (com `https://`) |
| `WEB_URL` | sim | URL da Vercel **exata** (CORS + cookies) |
| `JWT_ACCESS_SECRET` | sim | Segredo 32+ chars |
| `JWT_REFRESH_SECRET` | sim | Outro segredo 32+ chars |
| `JWT_ACCESS_EXPIRES` | sim | `15m` |
| `JWT_REFRESH_TTL_SECONDS` | sim | `604800` (7 dias) |
| `STORAGE_MODE` | sim | `gcs` |
| `GCS_BUCKET` | sim | `bula_remates_gestao` |
| `GCS_PROJECT_ID` | sim | ID GCP (Configurações do projeto) |
| `GCP_SERVICE_ACCOUNT_JSON` | sim* | JSON da service account (Railway) |
| `GOOGLE_APPLICATION_CREDENTIALS` | sim* | Caminho do JSON (local) |

\* Uma das duas formas de credencial.

\* Railway define `PORT` automaticamente — use o que o host fornece.

### Checklist pós-deploy API

- [ ] `GET https://SUA-API/health` retorna OK
- [ ] Logs sem erro de conexão Postgres/Redis
- [ ] `WEB_URL` = domínio final do front (sem typo, `https://`)

---

## Fase 5 — Frontend Next.js (Vercel)

> **Root Directory:** `apps/web` (não `apps/api`).

### Novo projeto

- [ ] Importar `eberts1/bula_remates_gestao`
- [ ] **Framework:** Next.js
- [ ] **Root Directory:** `apps/web`
- [ ] **Branch:** `main`

### Build (monorepo pnpm)

Se o deploy falhar por `@docs/shared`:

| Campo | Valor |
|--------|--------|
| Install Command | `cd ../.. && pnpm install` |
| Build Command | `pnpm build` ou `next build` |
| Output Directory | (padrão Next.js) |

- [ ] Primeiro deploy concluído
- [ ] URL anotada (ex. `https://bula-remates-gestao-web.vercel.app`)

### Variáveis de ambiente — Vercel

| Variável | Valor |
|----------|--------|
| `API_URL` | Mesma URL pública da API (`https://...`) |
| `NEXT_PUBLIC_API_URL` | **Igual** a `API_URL` |

- [ ] As duas variáveis salvas
- [ ] **Redeploy** após salvar env vars

### Atualizar API com URL final do front

- [ ] Voltar no Railway/Render e setar `WEB_URL` = URL exata da Vercel
- [ ] Redeploy da API se mudou `WEB_URL`
- [ ] Atualizar CORS do GCS se a URL da Vercel mudou

---

## Fase 6 — Validação end-to-end

### Saúde

- [ ] `GET /health` na API → sucesso
- [ ] Abrir URL da Vercel → página de login carrega

### Autenticação

- [ ] Acessar `/register` na Vercel
- [ ] Criar empresa/usuário
- [ ] Login em `/login`
- [ ] Cookie de sessão persiste (sem erro CORS no console do browser)

### Upload (GCS)

- [ ] Upload de um PDF de teste em documentos
- [ ] Objeto aparece no bucket em `tenants/{tenantId}/documents/...`
- [ ] Download funciona

### Clientes (se usar em produção)

- [ ] Listagem de clientes
- [ ] Importação ou cadastro público (se aplicável)

---

## Fase 7 — Troubleshooting rápido

| Sintoma | Verificar |
|---------|-----------|
| CORS no browser | `WEB_URL` na API = URL exata da Vercel; CORS do bucket inclui essa origem |
| Cookie não grava | Mesmo domínio/https; `credentials: true` já está na API |
| 401 / refresh falha | `REDIS_URL` correta; Upstash acessível da API |
| Upload falha no GCS | CORS do bucket; `STORAGE_MODE=gcs`; JSON da service account |
| Build Vercel falha | Install na raiz do monorepo; root `apps/web` |
| API não sobe | `DATABASE_URL` com SSL; migrations rodadas |
| 403 quota storage | Quota do tenant no banco ou excluir documentos de teste |

---

## Referência rápida — onde cada secret mora

| Secret / dado | Onde configurar |
|---------------|-----------------|
| Postgres | API → `DATABASE_URL` |
| Redis | API → `REDIS_URL` |
| JWT | API → `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` |
| GCS | API → `GCS_*`, `GOOGLE_APPLICATION_CREDENTIALS` |
| URL da API | API → `API_URL`; Vercel → `API_URL` + `NEXT_PUBLIC_API_URL` |
| URL do front | API → `WEB_URL`; GCS CORS |

---

## Ordem resumida (não pule)

1. Neon + Upstash + GCS  
2. Deploy API + env vars + migrations  
3. Testar `/health`  
4. Deploy Vercel (`apps/web`) + env vars  
5. Ajustar `WEB_URL` e CORS GCS com URL final  
6. Testes de login e upload  

---

## Links úteis

- [Neon](https://neon.tech)
- [Upstash](https://upstash.com)
- [Vercel — Monorepos](https://vercel.com/docs/monorepos)
- [Railway](https://railway.app)
- Guia resumido no repo: `docs/DEPLOY.md`

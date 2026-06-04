# API no Cloud Run (sem chave JSON — contorna política da org)

Use quando `iam.disableServiceAccountKeyCreation` bloquear chave na conta `bula-remates-api`.

A API roda **dentro do GCP** e usa a conta de serviço anexada — **sem** `GCP_SERVICE_ACCOUNT_JSON`.

| Item | Valor |
|------|--------|
| Projeto | `project-d6404b45-77db-438e-9d5` |
| Região | `southamerica-east1` (São Paulo) |
| Conta de serviço | `bula-remates-api@project-d6404b45-77db-438e-9d5.iam.gserviceaccount.com` |
| Bucket | `bula_remates_gestao` |

## 1. Pré-requisitos no GCP

- [ ] Conta `bula-remates-api` com **Storage Object Admin** no bucket `bula_remates_gestao` (aba Permissões do bucket)
- [ ] CORS no bucket (`docs/gcs-cors.json` + URL da Vercel)
- [ ] [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) instalado
- [ ] Login: `gcloud auth login`

```bash
gcloud config set project project-d6404b45-77db-438e-9d5
```

Habilite APIs (uma vez):

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

## 2. Deploy (na pasta raiz do repositório)

Substitua os valores `COLOQUE_...` antes de rodar.

**PowerShell (Windows):**

```powershell
cd "C:\Users\Matheus\Desktop\projetos FRONT END\docs_bula_remates"

gcloud run deploy bula-remates-api `
  --source . `
  --dockerfile apps/api/Dockerfile `
  --region southamerica-east1 `
  --platform managed `
  --timeout 300 `
  --memory 1Gi `
  --allow-unauthenticated `
  --service-account bula-remates-api@project-d6404b45-77db-438e-9d5.iam.gserviceaccount.com `
  --set-env-vars "NODE_ENV=production,STORAGE_MODE=gcs,GCS_BUCKET=bula_remates_gestao,GCS_PROJECT_ID=project-d6404b45-77db-438e-9d5,DATABASE_URL=COLOQUE_NEON,REDIS_URL=COLOQUE_REDIS,JWT_ACCESS_SECRET=COLOQUE_1,JWT_REFRESH_SECRET=COLOQUE_2,JWT_ACCESS_EXPIRES=15m,JWT_REFRESH_TTL_SECONDS=604800,WEB_URL=COLOQUE_VERCEL,API_URL=COLOQUE_URL_CLOUD_RUN_DEPOIS"
```

Na **primeira** vez, `API_URL` pode ser temporário; depois do deploy copie a URL que o comando imprime e atualize:

```bash
gcloud run services update bula-remates-api --region southamerica-east1 --update-env-vars "API_URL=https://SUA-URL.run.app"
```

**Não** defina `GCP_SERVICE_ACCOUNT_JSON` no Cloud Run.

## 3. Vercel (front)

```env
API_URL=https://SUA-URL.run.app
NEXT_PUBLIC_API_URL=https://SUA-URL.run.app
```

`WEB_URL` no Cloud Run = **exatamente** a URL do app na Vercel (ex. `https://seu-app.vercel.app`), sem barra no final. A importação de PDF envia o arquivo **direto do navegador** para a API (CORS); se `WEB_URL` estiver errado, o upload falha.

Importação de PDFs grandes: timeout da API **300s** e memória **1Gi** (ver flags no deploy acima).

## 4. Testes

```bash
curl https://SUA-URL.run.app/health
```

- Login no app
- Upload de PDF → objeto em `gs://bula_remates_gestao/tenants/...`

## 5. Railway

Pode **pausar** o serviço `@docs/api` no Railway e usar só Cloud Run + Vercel.

## 6. Política da org (opcional)

Na lista da org, abra a política **legada** `iam.disableServiceAccountKeyCreation` (não confundir com `iam.managed.disableServiceAccountApiKeyCreation`).

**Gerenciar política** → **Substituir** → **Desligado** no projeto ou na org.

Cloud Run **não depende** disso se a conta `bula-remates-api` estiver anexada ao serviço.

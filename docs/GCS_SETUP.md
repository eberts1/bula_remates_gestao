# Google Cloud Storage — bucket `bula_remates_gestao`

A API usa a biblioteca `@google-cloud/storage` com **conta de serviço (JSON)**.  
**Não use** chaves HMAC da aba *Interoperabilidade* (Configurações do Cloud Storage) — elas servem para API compatível com S3, não para este projeto.

## 1. Console — o que fazer

### Bucket

1. Abra o bucket: [bula_remates_gestao](https://console.cloud.google.com/storage/browser/bula_remates_gestao)
2. **Permissions** → confirme **Uniform bucket-level access** ativado
3. Anote o **Project ID** em [IAM → Configurações](https://console.cloud.google.com/iam-admin/settings) (campo *ID do projeto*, ex. `meu-projeto-123456`)

### CORS (upload direto do browser)

1. No bucket → aba **Configuration** → **CORS**
2. Cole o conteúdo de [`gcs-cors.json`](./gcs-cors.json), trocando `https://SEU-APP.vercel.app` pela URL real da Vercel (sem `/` no final)
3. Salve

Ou via CLI (com `gcloud` instalado):

```bash
gcloud storage buckets update gs://bula_remates_gestao --cors-file=docs/gcs-cors.json
```

### Conta de serviço (credencial correta)

1. [IAM → Contas de serviço](https://console.cloud.google.com/iam-admin/serviceaccounts) → **Criar conta de serviço**
   - Nome: `bula-remates-api`
2. Papel no projeto ou só no bucket:
   - `Storage Object Admin` no bucket `bula_remates_gestao`, **ou**
   - Papéis: `Storage Object Creator` + `Storage Object Viewer`
3. Aba **Chaves** → **Adicionar chave** → **JSON** → baixar o arquivo
4. **Nunca** commitar esse JSON no Git

### O que ignorar no print de Interoperabilidade

- *Chaves de acesso da conta de usuário* (HMAC) — **não** entram no Railway deste app
- *Projeto padrão para acesso interoperável* — opcional; não substitui service account

## 2. Variáveis na API (Railway)

| Variável | Valor |
|----------|--------|
| `STORAGE_MODE` | `gcs` |
| `GCS_BUCKET` | `bula_remates_gestao` |
| `GCS_PROJECT_ID` | ID do projeto GCP (Configurações do projeto) |
| `GCP_SERVICE_ACCOUNT_JSON` | Conteúdo **inteiro** do JSON da conta de serviço (uma linha no Raw Editor) |

Alternativa local: `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json` (caminho do arquivo).

## 3. Teste rápido

Após deploy com `STORAGE_MODE=gcs`:

1. Login no app (Vercel)
2. Upload de um PDF em Documentos
3. No bucket, verificar pasta `tenants/{tenantId}/documents/...`

## 4. Erro: “Criação da chave da conta de serviço está desativada”

Política da organização `rematesbula.org`: **`iam.disableServiceAccountKeyCreation`**.  
Não é bug do projeto — a org **proíbe** arquivo JSON de chave.

### Caminho A — Liberar chave só neste projeto (se você é admin da org)

1. [Políticas da organização](https://console.cloud.google.com/iam-admin/orgpolicies?organizationId=0) (org `rematesbula.org`)
2. Busque **“Disable service account key creation”** / `iam.disableServiceAccountKeyCreation`
3. **Gerenciar política** → **Substituir** → **Personalizar**
4. Regra: **Desativar** a restrição **ou** exceção para o projeto `project-d6404b45-77db-438e-9d5`
5. Papel necessário: **Administrador de políticas da organização** (`roles/orgpolicy.policyAdmin`)

Depois disso, volte em **Contas de serviço → bula-remates-api → Chaves → JSON**.

### Caminho B — API no Google Cloud Run (recomendado sem JSON)

Passo a passo completo: **[CLOUD_RUN.md](./CLOUD_RUN.md)** (`Dockerfile` em `apps/api/Dockerfile`).

Com a API **rodando no GCP**, ela usa a conta de serviço **anexada ao Cloud Run** — sem baixar chave.

1. Conta `bula-remates-api` com **Storage Object Admin** no bucket
2. `gcloud run deploy` (ver `CLOUD_RUN.md`)
3. **Sem** `GCP_SERVICE_ACCOUNT_JSON`
4. Front na **Vercel**; `API_URL` = URL do Cloud Run

### Caminho C — Seguir no Railway sem GCS (temporário)

```env
STORAGE_MODE=local
```

Login, clientes e banco funcionam; **uploads somem** a cada redeploy. Use só até liberar A ou implementar B.

**HMAC (Interoperabilidade)** continua **incompatível** com esta API.

## 5. Segurança

Se uma chave HMAC ou secret foi exposta em chat ou print:

1. Exclua a chave HMAC no console
2. Não reutilize secrets HMAC no Railway

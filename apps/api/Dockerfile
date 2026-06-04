# Build a partir da raiz do monorepo:
#   gcloud run deploy bula-remates-api --source . --dockerfile apps/api/Dockerfile ...

FROM node:20-alpine AS build
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared ./packages/shared/
COPY apps/api ./apps/api/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @docs/shared build
RUN pnpm --filter @docs/api exec prisma generate
RUN pnpm --filter @docs/api build

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages/shared ./packages/shared

ENV NODE_ENV=production
WORKDIR /app/apps/api
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

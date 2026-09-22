# ════════════════════════════════════════════════════════════════════════════
# chum-inv-frontend — Next 16 standalone image.
#
# Same shape as the LIS image. Two things worth knowing:
#
# 1. `.env` travels in with the BUILD CONTEXT and `next build` reads it there.
#    There are no build args: basePath and every NEXT_PUBLIC_* are inlined into
#    the client bundle at build time, so they cannot be supplied later.
#
# 2. The output is COMPILED, so the compose service must NOT bind-mount
#    ./chum-inv-frontend over /app — that would hide .next/ and the container
#    would not start.
# ════════════════════════════════════════════════════════════════════════════

# ── deps ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── build ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Fails loudly rather than silently producing an unprefixed bundle.
RUN test -f .env || (echo "ERROR: .env is required at build time (basePath + NEXT_PUBLIC_* are inlined)." && exit 1)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runtime ─────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# `output: "standalone"` emits a self-contained server plus the minimal
# node_modules it actually needs, so nothing else has to be installed here.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER node

EXPOSE 3003

CMD ["node", "server.js"]

# ---- Stage 1: install dependencies ----
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: build ----
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* variables are inlined into the client-side JS bundle
# at build time (Next.js replaces process.env.NEXT_PUBLIC_API_URL with
# a literal string while compiling) -- setting this as a runtime ENV
# on the final image would do nothing, since by then the browser
# bundle is already frozen. A build ARG is the only way to actually
# control it; override with `--build-arg` per deployment target.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# ---- Stage 3: runtime ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN useradd --create-home appuser
USER appuser

# `output: "standalone"` already traced and pruned node_modules down
# to only what's actually imported -- copy that instead of the full
# node_modules from the build stage. Static assets and public/ aren't
# traced the same way, so they're copied separately.
COPY --from=builder --chown=appuser:appuser /app/.next/standalone ./
COPY --from=builder --chown=appuser:appuser /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appuser /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]

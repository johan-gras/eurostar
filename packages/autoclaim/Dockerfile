# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/autoclaim/package.json ./packages/autoclaim/
COPY packages/core/package.json ./packages/core/
COPY packages/seatmap/package.json ./packages/seatmap/
COPY packages/euroqueue/package.json ./packages/euroqueue/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages

# Copy source files
COPY . .

# Build packages
RUN pnpm turbo build --filter=@eurostar/autoclaim

# Stage 3: Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

# Copy built packages
COPY --from=builder --chown=fastify:nodejs /app/packages/core/dist ./packages/core/dist
COPY --from=builder --chown=fastify:nodejs /app/packages/core/package.json ./packages/core/
COPY --from=builder --chown=fastify:nodejs /app/packages/seatmap/dist ./packages/seatmap/dist
COPY --from=builder --chown=fastify:nodejs /app/packages/seatmap/package.json ./packages/seatmap/
COPY --from=builder --chown=fastify:nodejs /app/packages/euroqueue/dist ./packages/euroqueue/dist
COPY --from=builder --chown=fastify:nodejs /app/packages/euroqueue/package.json ./packages/euroqueue/
COPY --from=builder --chown=fastify:nodejs /app/packages/autoclaim/dist ./packages/autoclaim/dist
COPY --from=builder --chown=fastify:nodejs /app/packages/autoclaim/package.json ./packages/autoclaim/

# Copy node_modules (production only)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/autoclaim/node_modules ./packages/autoclaim/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules

USER fastify

EXPOSE 3001

ENV PORT=3001
ENV HOST="0.0.0.0"

WORKDIR /app/packages/autoclaim
CMD ["node", "dist/server.js"]

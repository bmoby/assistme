## ─── Stage 1: Build ───────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy dependency files first (cache layer)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/core/package.json packages/core/
COPY packages/bot-telegram/package.json packages/bot-telegram/
COPY packages/bot-telegram-public/package.json packages/bot-telegram-public/
COPY packages/bot-discord/package.json packages/bot-discord/
COPY packages/bot-discord-quiz/package.json packages/bot-discord-quiz/

RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ packages/

# Build all packages
RUN pnpm build

## ─── Stage 2: Production ─────────────────────────────────────
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/bot-telegram/package.json packages/bot-telegram/
COPY packages/bot-telegram-public/package.json packages/bot-telegram-public/
COPY packages/bot-discord/package.json packages/bot-discord/
COPY packages/bot-discord-quiz/package.json packages/bot-discord-quiz/

RUN pnpm install --frozen-lockfile --prod

# Copy built output from builder
COPY --from=builder /app/packages/core/dist packages/core/dist
COPY --from=builder /app/packages/bot-telegram/dist packages/bot-telegram/dist
COPY --from=builder /app/packages/bot-telegram-public/dist packages/bot-telegram-public/dist
COPY --from=builder /app/packages/bot-discord/dist packages/bot-discord/dist
COPY --from=builder /app/packages/bot-discord-quiz/dist packages/bot-discord-quiz/dist

ENV NODE_ENV=production

## ─── Stage 3: Seed runner (knowledge base) ──────────────────
FROM builder AS seed

# Copy content files needed by the seed script
COPY learning-knowledge/ learning-knowledge/
COPY scripts/ scripts/

CMD ["npx", "tsx", "scripts/seed-formation-knowledge.ts"]

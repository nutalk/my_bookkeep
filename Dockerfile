FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build
FROM deps AS builder
COPY . .
RUN NEXT_OUTPUT=standalone bun run build

# Production
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Bun >= 1.3.4 的基础镜像已换基到 Debian trixie，不再自带 adduser/addgroup，
# 改用 passwd 包提供的 groupadd/useradd 创建非 root 用户（行为与之前一致）。
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --home-dir /nonexistent --no-create-home nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migration files and scripts
# src/db/migrate.ts 会在启动时运行，并引用 src/lib/ledger.ts，两者都要打进镜像
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && \
    chown -R nextjs:nodejs src drizzle.config.ts docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]

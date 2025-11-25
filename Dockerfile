# Use Bun for dependency installs and builds
FROM oven/bun:1.1 AS base
WORKDIR /app

# Copy dependency manifests and install with Bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy application files
COPY . .

# Disable ESLint during the build as requested
ENV NEXT_DISABLE_ESLINT=1
RUN bun run build

# Production image
FROM oven/bun:1.1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_DISABLE_ESLINT=1

# Only copy necessary files
COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules

EXPOSE 3000
CMD ["bun", "run", "start"]

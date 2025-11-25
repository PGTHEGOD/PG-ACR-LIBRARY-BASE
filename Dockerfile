# Use Node 20 as the base image
FROM node:20-alpine AS base

# Install dependencies for building
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package manifests
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./

# Install pnpm (if needed) and dependencies
RUN corepack enable && pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Build the Next.js application
RUN pnpm build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Only copy necessary files
COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules

EXPOSE 3000
CMD ["pnpm", "start"]

# Use Node 20 as the base image
FROM node:20-alpine AS base
WORKDIR /app

# Ensure required system libraries are present
RUN apk add --no-cache libc6-compat

# Copy dependency manifests and install with npm
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Disable ESLint during the build as requested
ENV NEXT_DISABLE_ESLINT=1
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_DISABLE_ESLINT=1

# Only copy necessary files
COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "run", "start"]

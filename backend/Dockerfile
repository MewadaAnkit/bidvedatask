FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL and libc compatibility (required by Prisma on Alpine)
RUN apk add --no-cache openssl libc6-compat

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and build TypeScript
COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# Production Image
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL and libc compatibility for Prisma CLI & query engine
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

# Copy compiled files and entrypoint
COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 5000

CMD ["./docker-entrypoint.sh"]


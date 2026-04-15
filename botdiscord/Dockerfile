# Use Node 20 alpine as builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json and workspace configurations
COPY package.json package-lock.json* ./
COPY botdiscord/package.json ./botdiscord/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY botdiscord ./botdiscord
COPY packages/shared ./packages/shared

# Generate Prisma Client and Build
WORKDIR /app/botdiscord
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/package.json ./
# Copy hoisted node modules from root
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/botdiscord/package.json ./botdiscord/
COPY --from=builder /app/botdiscord/dist ./botdiscord/dist
COPY --from=builder /app/botdiscord/prisma ./botdiscord/prisma

WORKDIR /app/botdiscord
EXPOSE 3000

CMD ["npm", "run", "start"]

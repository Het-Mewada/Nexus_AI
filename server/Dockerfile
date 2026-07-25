FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma Client then build TypeScript
RUN npx prisma generate
RUN npm run build

# ─── Production Image ───────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Only install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled code and Prisma artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

EXPOSE 3001

# Run migrations then start the server
CMD sh -c "npx prisma migrate deploy && node dist/index.js"

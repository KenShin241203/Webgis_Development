# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

# Install dependencies first
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Ensure uploads directory exists and writable
RUN mkdir -p /app/uploads && chmod -R 775 /app/uploads

ENV NODE_ENV=production
ENV PORT_SERVER=3000

EXPOSE 3000

# Start: seed auth (non-fatal if already seeded), then start server
CMD ["sh", "-c", "node src/scripts/initializeAuth.js || true; node index.js"] 
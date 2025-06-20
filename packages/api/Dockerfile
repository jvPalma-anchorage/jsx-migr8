# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json yarn.lock lerna.json ./
COPY packages/api/package.json ./packages/api/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy API source code
COPY packages/api ./packages/api

# Build the API
WORKDIR /app/packages/api
RUN yarn build

# Production stage
FROM node:22-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/yarn.lock /app/lerna.json ./
COPY --from=builder /app/packages/api/package.json ./packages/api/

# Install production dependencies only
ENV NODE_ENV=production
RUN yarn install --frozen-lockfile --production

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/packages/api/dist ./packages/api/dist

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "packages/api/dist/index.js"]
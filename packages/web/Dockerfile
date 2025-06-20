# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json yarn.lock lerna.json ./
COPY packages/web/package.json ./packages/web/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy web source code
COPY packages/web ./packages/web

# Build the web app
WORKDIR /app/packages/web
RUN yarn build

# Production stage - using nginx
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx config
COPY packages/web/nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
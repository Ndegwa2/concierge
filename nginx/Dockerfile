# Frontend Dockerfile for AutoConcierge
# Multi-stage build: build stage -> production nginx stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (use npm ci for reproducible builds)
RUN npm ci --prefer-offline

# Copy source code
COPY . .

# Build the production bundle
RUN npm run build

# --- Production stage ---
FROM nginx:1.27-alpine AS production

# Install openssl for certificate generation
RUN apk add --no-cache openssl

# Copy custom nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy SSL generation script
COPY nginx/generate-ssl.sh /docker-entrypoint.d/40-generate-ssl.sh
RUN chmod +x /docker-entrypoint.d/40-generate-ssl.sh

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy built frontend assets
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist/ /var/www/frontend/

# Expose ports
EXPOSE 80 443

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:80/api/health || exit 1

# Entrypoint script to generate SSL certs if needed, then start nginx
COPY <<'EOF' /docker-entrypoint.sh
#!/bin/sh
set -e

# Generate self-signed SSL certificates if they don't exist
if [ ! -f /etc/nginx/ssl/fullchain.pem ] || [ ! -f /etc/nginx/ssl/privkey.pem ]; then
    echo "Generating self-signed SSL certificates..."
    /docker-entrypoint.d/40-generate-ssl.sh
fi

# Start nginx in the foreground
echo "Starting nginx..."
exec nginx -g 'daemon off;'
EOF

RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

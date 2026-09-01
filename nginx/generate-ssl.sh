#!/bin/bash
set -e

SSL_DIR="/etc/nginx/ssl"
DAYS_VALID=365

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Check if certificates already exist
if [ -f "$SSL_DIR/fullchain.pem" ] && [ -f "$SSL_DIR/privkey.pem" ]; then
    echo "SSL certificates already exist in $SSL_DIR"
    exit 0
fi

echo "Generating self-signed SSL certificates for development..."

# Generate private key and certificate
openssl req -x509 \
    -nodes \
    -days "$DAYS_VALID" \
    -newkey rsa:2048 \
    -keyout "$SSL_DIR/privkey.pem" \
    -out "$SSL_DIR/fullchain.pem" \
    -subj "/C=KE/ST=Nairobi/L=Nairobi/O=AutoConcierge/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:0.0.0.0"

# Set proper permissions
chmod 600 "$SSL_DIR/privkey.pem"
chmod 644 "$SSL_DIR/fullchain.pem"

echo "Self-signed certificates generated successfully in $SSL_DIR"
echo "Valid for $DAYS_VALID days"

#!/bin/bash
set -e

# ===========================================================================
# AutoConcierge Backend Docker Entrypoint
# ===========================================================================
# Handles database migrations, waits for dependencies, and starts Gunicorn.
# ===========================================================================

echo "============================================"
echo "  AutoConcierge Backend Starting..."
echo "============================================"

# ---------------------------------------------------------------------------
# Wait for PostgreSQL
# ---------------------------------------------------------------------------
echo "Waiting for PostgreSQL..."
until pg_isready -h postgres -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; do
    echo "  PostgreSQL not ready, retrying in 2s..."
    sleep 2
done
echo "PostgreSQL is ready."

# ---------------------------------------------------------------------------
# Wait for Redis
# ---------------------------------------------------------------------------
echo "Waiting for Redis..."
until redis-cli -h redis -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; do
    echo "  Redis not ready, retrying in 2s..."
    sleep 2
done
echo "Redis is ready."

# ---------------------------------------------------------------------------
# Run database migrations
# ---------------------------------------------------------------------------
echo "Running database migrations..."
flask db upgrade
echo "Migrations complete."

# ---------------------------------------------------------------------------
# Create upload directories if needed
# ---------------------------------------------------------------------------
mkdir -p /app/uploads/employee_documents

# ---------------------------------------------------------------------------
# Start Gunicorn
# ---------------------------------------------------------------------------
echo "Starting Gunicorn on port ${PORT:-8000}..."
exec gunicorn -c gunicorn.conf.py run:app

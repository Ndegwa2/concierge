"""
Production Gunicorn Configuration for AutoConcierge
===================================================
This configuration is used for the Flask backend in production deployments.

Usage:
    gunicorn -c gunicorn.conf.py run:app

Environment variables (override defaults as needed):
    GUNICORN_WORKERS   - Number of worker processes (default: auto = 2 * CPU + 1)
    GUNICORN_THREADS   - Threads per worker (default: 4)
    GUNICORN_TIMEOUT   - Worker timeout in seconds (default: 120)
    GUNICORN_BIND      - Bind address (default: 0.0.0.0:$PORT)
"""
import multiprocessing
import os

# ---------------------------------------------------------------------------
# Server socket
# ---------------------------------------------------------------------------
_port = os.environ.get('PORT', '10000')
bind = os.environ.get('GUNICORN_BIND', f'0.0.0.0:{_port}')
backlog = 2048

# ---------------------------------------------------------------------------
# Worker processes
# ---------------------------------------------------------------------------
workers = int(os.environ.get('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = os.environ.get('GUNICORN_WORKER_CLASS', 'gevent')
worker_connections = int(os.environ.get('GUNICORN_WORKER_CONNECTIONS', 1000))
threads = int(os.environ.get('GUNICORN_THREADS', 1))

# ---------------------------------------------------------------------------
# Worker lifecycle
# ---------------------------------------------------------------------------
# Restart workers to prevent memory leaks
max_requests = int(os.environ.get('GUNICORN_MAX_REQUESTS', 1000))
max_requests_jitter = int(os.environ.get('GUNICORN_MAX_REQUESTS_JITTER', 50))

# Timeout to handle long-running requests gracefully
timeout = int(os.environ.get('GUNICORN_TIMEOUT', 120))
graceful_timeout = 30

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
# Use JSON-ish access log for log aggregation pipelines
accesslog = '-'
access_log_format = (
    '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s '
    '"%(f)s" "%(a)s" %({X-Request-ID}o)s'
)
errorlog = '-'
loglevel = os.environ.get('GUNICORN_LOGLEVEL', 'info')
capture_output = True

# ---------------------------------------------------------------------------
# Process naming
# ---------------------------------------------------------------------------
proc_name = 'autoconcierge-gunicorn'

# ---------------------------------------------------------------------------
# Pre/post hooks
# ---------------------------------------------------------------------------
# Preload the application so workers share memory (copy-on-write).
# This reduces memory usage and speeds up worker boot.
preload_app = True


def when_ready(server):
    """Log a readiness message when the server is ready to accept requests."""
    server.log.info("AutoConcierge Gunicorn server is ready. Listening on %s", bind)


def on_exit(server):
    """Clean shutdown hook."""
    server.log.info("AutoConcierge Gunicorn server is shutting down.")

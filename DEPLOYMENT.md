# Ndegwa Auto Concierge - Deployment Guide

This guide covers deploying the Auto Concierge application using Docker Compose or Render.

## Architecture Overview

The application consists of:
- **Frontend:** React + Vite + Tailwind CSS (static site)
- **Backend:** Python Flask + SQLAlchemy (REST API)
- **Database:** PostgreSQL 16 (production) / SQLite (development)
- **Cache:** Redis 7 (rate limiting, caching, Celery broker)
- **Task Queue:** Celery + Redis (async email, PDF, AI, payment tasks)
- **Web Server:** Gunicorn + Gevent (production WSGI)
- **Reverse Proxy:** Nginx (optional, for SSL termination and static serving)

---

## Deployment Options

### Option 1: Docker Compose (Recommended for Production)

#### Prerequisites
- Docker and Docker Compose installed
- Git

#### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd concierge
   ```

2. **Configure environment variables**
   Create a `.env` file in the project root:
   ```env
   POSTGRES_DB=autoconcierge
   POSTGRES_USER=autoconcierge
   POSTGRES_PASSWORD=your-secure-password
   REDIS_PASSWORD=your-redis-password
   SECRET_KEY=your-flask-secret-key
   JWT_SECRET_KEY=your-jwt-secret-key
   ENCRYPTION_KEY=your-base64-encryption-key
   CORS_ORIGIN=https://your-frontend-domain.com
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-app-password
   MPESA_CONSUMER_KEY=your-mpesa-key
   MPESA_CONSUMER_SECRET=your-mpesa-secret
   MPESA_PASSKEY=your-mpesa-passkey
   MPESA_SHORTCODE=your-mpesa-shortcode
   MPESA_CALLBACK_URL=https://your-api.com/payments/mpesa/callback
   COHERE_API_KEY=your-cohere-api-key
   ```

3. **Initialize PostgreSQL**
   ```bash
   docker-compose exec postgres psql -U autoconcierge -d autoconcierge -f backend/postgresql_setup.sql
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec backend flask db upgrade
   ```

5. **Start all services**
   ```bash
   docker-compose up --build -d
   ```

6. **Verify deployment**
   ```bash
   curl http://localhost/api/health
   ```

#### Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 80/443 | Served via Nginx |
| Backend | 8000 | Flask API via Gunicorn |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache and broker |
| Celery Worker | - | Background task processing |
| Celery Beat | - | Scheduled task scheduler |

---

### Option 2: Render Blueprint

The repository includes a `render.yaml` file for automated deployment.

#### Steps

1. Push your code to GitHub
2. Go to [Render Blueprint Instances](https://dashboard.render.com/blueprints)
3. Click "New Blueprint Instance"
4. Connect your GitHub repository
5. Render will automatically provision:
   - PostgreSQL 16 database (with read replica)
   - Redis instance
   - Backend web service (Gunicorn)
   - Frontend static site

#### Post-Deployment

1. Run PostgreSQL setup:
   ```bash
   psql $DATABASE_URL -f backend/postgresql_setup.sql
   ```

2. Run migrations:
   ```bash
   flask db upgrade
   ```

3. Update `CORS_ORIGIN` in backend environment variables to match your frontend URL
4. Update `VITE_API_URL` in frontend environment variables to match your backend URL

---

### Option 3: Manual Deployment

#### Backend

1. **Set up Python environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment variables**
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/autoconcierge
   DATABASE_READ_URL=postgresql://user:password@host:5432/autoconcierge
   REDIS_URL=redis://:password@host:6379/0
   RATELIMIT_STORAGE_URI=redis://:password@host:6379/1
   SECRET_KEY=your-secret-key
   JWT_SECRET_KEY=your-jwt-secret
   ENCRYPTION_KEY=your-base64-encryption-key
   CORS_ORIGIN=https://your-frontend.com
   FLASK_ENV=production
   ```

3. **Run migrations**
   ```bash
   flask db upgrade
   ```

4. **Start with Gunicorn**
   ```bash
   gunicorn --bind 0.0.0.0:8000 --workers 4 --threads 4 --timeout 120 run:app
   ```

#### Frontend

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build for production**
   ```bash
   npm run build
   ```

3. **Serve the `dist` directory** with Nginx or any static file server

---

## Environment Variables

### Required Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `DATABASE_READ_URL` | Read replica connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://:pass@host:6379/0` |
| `RATELIMIT_STORAGE_URI` | Rate limiter storage | `redis://:pass@host:6379/1` |
| `SECRET_KEY` | Flask secret key | Random 32+ char string |
| `JWT_SECRET_KEY` | JWT signing secret | Random 32+ char string |
| `ENCRYPTION_KEY` | Field encryption key (base64, 32 bytes) | `python -c "import base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"` |
| `CORS_ORIGIN` | Allowed frontend origins (comma-separated) | `https://app.example.com` |

### Optional Backend Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` (dev) / `8000` (Docker) |
| `JWT_ACCESS_EXPIRES_MINUTES` | Access token TTL | `30` |
| `JWT_REFRESH_EXPIRES_DAYS` | Refresh token TTL | `7` |
| `BEHIND_PROXY` | Trust proxy headers | `True` |
| `ENFORCE_HTTPS` | Enforce HTTPS redirect | `False` |
| `GUNICORN_WORKERS` | Gunicorn worker count | `4` |
| `GUNICORN_THREADS` | Gunicorn threads per worker | `4` |
| `MAIL_SERVER` | SMTP server | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USERNAME` | SMTP username | - |
| `MAIL_PASSWORD` | SMTP password | - |
| `MPESA_CONSUMER_KEY` | M-Pesa API key | - |
| `MPESA_CONSUMER_SECRET` | M-Pesa API secret | - |
| `MPESA_PASSKEY` | M-Pesa passkey | - |
| `MPESA_SHORTCODE` | M-Pesa shortcode | - |
| `MPESA_CALLBACK_URL` | M-Pesa callback URL | - |
| `COHERE_API_KEY` | Cohere AI API key | - |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://api.example.com/api` |
| `VITE_APP_ENV` | Application environment | `production` |

---

## Database Management

### Migrations

```bash
cd backend
flask db migrate -m "Description of change"
flask db upgrade
```

### Backup (PostgreSQL)

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Restore (PostgreSQL)

```bash
psql $DATABASE_URL < backup_20240101.sql
```

---

## Monitoring

### Health Check

```bash
curl https://your-api.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "AutoConcierge Backend",
  "request_id": "uuid"
}
```

### Logs

**Docker Compose:**
```bash
docker-compose logs -f backend
docker-compose logs -f celery-worker
```

**Render:**
View logs in the Render dashboard or use the Render CLI.

---

## Security Checklist

- [ ] `SECRET_KEY` and `JWT_SECRET_KEY` are set to strong random values
- [ ] `ENCRYPTION_KEY` is generated and set (base64, 32 bytes)
- [ ] `CORS_ORIGIN` is restricted to your frontend domain(s)
- [ ] Database uses strong passwords
- [ ] Redis has a strong password
- [ ] HTTPS is enforced at the reverse proxy level
- [ ] Firewall rules restrict database and Redis access
- [ ] Environment variables are not committed to version control
- [ ] Regular security updates are applied to dependencies

---

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `CORS_ORIGIN` includes your frontend URL exactly (including `https://`)

2. **Database Connection Errors**
   - Verify `DATABASE_URL` is correct
   - Ensure PostgreSQL is running and accessible
   - Check database user permissions

3. **Redis Connection Errors**
   - Verify `REDIS_URL` and `RATELIMIT_STORAGE_URI`
   - Ensure Redis is running

4. **Celery Tasks Not Running**
   - Verify Redis connection
   - Check Celery worker logs for errors
   - Ensure task queues are correctly configured

5. **Migrations Not Applying**
   - Run `flask db upgrade` manually
   - Check Alembic version table in database

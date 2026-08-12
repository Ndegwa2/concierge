# PostgreSQL Migration Strategy: SQLite → PostgreSQL 16

## Overview

This document describes the production migration strategy for moving the
Ndegwa Auto Concierge backend database from SQLite 3 to PostgreSQL 16.
The migration must achieve **zero data loss** and **minimal downtime**.

---

## 1. Pre-Migration Preparation

### 1.1. Environment Setup

| Item | Value |
|------|-------|
| Source DB | SQLite 3 (`backend/autoconcierge.db`) |
| Target DB | PostgreSQL 16 |
| Target URI | `postgresql://autoconcierge:<password>@localhost:5432/autoconcierge_prod` |
| Read Replica | `postgresql://autoconcierge:<password>@localhost:5432/autoconcierge_prod_read` |
| ORM | SQLAlchemy 3.1.1 / Flask-SQLAlchemy 3.1.1 |
| Migration Tool | Alembic / Flask-Migrate 4.0.5 |

### 1.2. Dependency Updates

Add the `psycopg2-binary` driver to `requirements.txt`:

```txt
psycopg2-binary==2.9.9
```

Run `pip install -r requirements.txt` to install the PostgreSQL driver.

### 1.3. Configuration Changes

1. Set `DATABASE_URL` to the PostgreSQL connection string in production.
2. Set `DATABASE_READ_URL` to the read replica URI for read-heavy queries.
3. Generate a strong `JWT_SECRET_KEY` (min 32 chars):
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
4. Set `RATELIMIT_STORAGE_URI` to a Redis URL (currently `memory://`
   which is lost on restart).

---

## 2. Migration Approaches

### 2.1. Recommended: pgloader (Zero-Downtime, One-Time Transfer)

**Best for:** Initial bulk migration from SQLite to PostgreSQL.

```bash
# Install pgloader
brew install pgloader  # macOS
# or
sudo apt-get install pgloader  # Ubuntu

# Run the migration
pgloader sqlite:///backend/autoconcierge.db \
    postgresql://autoconcierge:<password>@localhost:5432/autoconcierge_prod
```

**Limitations:**
- Does NOT handle SQLite's `CHECK` constraints as PostgreSQL `CHECK` constraints
- Does NOT create indexes automatically
- Requires post-migration index creation (use the Alembic migration script)

### 2.2. Alternative: Manual Export/Import (Fallback)

If `pgloader` is unavailable, use Python's `sqlite3` → `csv` → `psql` pipeline:

```python
# backup_sqlite.py
import sqlite3, csv, os

conn = sqlite3.connect('backend/autoconcierge.db')
cursor = conn.cursor()

tables = [t[0] for t in cursor.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
).fetchall()]

os.makedirs('sqlite_backup', exist_ok=True)

for table in tables:
    cursor.execute(f"SELECT * FROM {table}")
    rows = cursor.fetchall()
    colnames = [desc[0] for desc in cursor.description]

    with open(f'sqlite_backup/{table}.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(colnames)
        writer.writerows(rows)

conn.close()
print(f"Backed up {len(tables)} tables")
```

Then use `psql` COPY to import each CSV into the corresponding PostgreSQL table.

### 2.3. Zero-Downtime: Logical Replication (Production-Critical)

**Best for:** Applications that cannot tolerate downtime.

This approach uses PostgreSQL's `pg_logical` extension to replicate changes
from SQLite. However, SQLite does not natively support logical decoding.
The practical approach is:

1. Take an initial snapshot with `pgloader` (Section 2.1).
2. Apply the Alembic migration to add indexes and type corrections.
3. During a brief maintenance window:
   - Stop the Flask application.
   - Run `pg_dump` on the SQLite DB to capture any last-minute changes.
   - Apply a differential migration of any new rows.
   - Switch `DATABASE_URL` to PostgreSQL.
   - Start the application.

**Recommended maintenance window:** 5–15 minutes depending on data volume.

---

## 3. Step-by-Step Migration Procedure

### Step 1: Provision PostgreSQL

On Render, create a PostgreSQL database instance (Standard-0 or higher):

```bash
# Or locally for testing:
docker run --name pg-autoconcierge \
    -e POSTGRES_PASSWORD=your_secure_password_here \
    -e POSTGRES_DB=autoconcierge_prod \
    -p 5432:5432 \
    -d postgres:16
```

### Step 2: Create Database Roles

```bash
psql -U postgres -c "
    CREATE ROLE autoconcierge_app LOGIN PASSWORD 'your_secure_password_here';
    CREATE ROLE autoconcierge_read NOLOGIN;
    CREATE ROLE autoconcierge_write NOLOGIN;
    CREATE ROLE autoconcierge_migrate LOGIN PASSWORD 'migrate_password_here' CREATEDB;
    GRANT autoconcierge_read, autoconcierge_write TO autoconcierge_app;
"
```

Or run the setup SQL script:

```bash
psql "postgresql://postgres@localhost/autoconcierge_prod" -f backend/postgresql_setup.sql
```

### Step 3: Run the Flask Alembic Migration (Creates Tables)

```bash
cd backend
flask db upgrade
```

This creates all tables with the correct PostgreSQL types (BigInteger PKs,
TIMESTAMPTZ, JSONB, indexes).

### Step 4: Migrate Data from SQLite

```bash
pgloader sqlite:///backend/autoconcierge.db \
    postgresql://autoconcierge:your_secure_password_here@localhost:5432/autoconcierge_prod
```

### Step 5: Apply PostgreSQL-Specific Indexes

The Alembic migration (Step 3) already includes index creation, but
if you migrated data first, re-run the index-creation portion:

```bash
# Run just the index-creation section of the migration
# or use the standalone SQL:
psql "postgresql://autoconcierge@localhost/autoconcierge_prod" \
    -f backend/postgresql_setup.sql
```

### Step 6: Verify Data Integrity

```sql
-- Count check
SELECT 'users' as table, count(*) FROM users
UNION ALL SELECT 'vehicles', count(*) FROM vehicles
UNION ALL SELECT 'appointments', count(*) FROM appointments
UNION ALL SELECT 'services', count(*) FROM services;

-- Type verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'appointments'
ORDER BY ordinal_position;

-- Index verification
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('appointments', 'vehicles', 'users')
ORDER BY tablename, indexname;
```

### Step 7: Cut Over (Maintenance Window)

1. Set a maintenance banner:
   ```bash
   # Enable maintenance mode
   curl -X POST https://your-api.onrender.com/maintenance/on
   ```
2. Verify no active writes to SQLite.
3. Run a final incremental sync if needed.
4. Update `DATABASE_URL` environment variable in Render dashboard.
5. Restart the application.
6. Run health checks:
   ```bash
   curl https://your-api.onrender.com/api/health
   ```

---

## 4. Rollback Plan

If issues arise after migration:

1. **Revert DATABASE_URL** to the SQLite URI.
2. **Restore the SQLite file** from backup if corrupted during migration:
   ```bash
   cp backend/autoconcierge.db.bak backend/autoconcierge.db
   ```
3. **Restart the application** to restore traffic to SQLite.
4. Investigate the failure using the backup PostgreSQL instance.

**Note:** The rollback window is limited to the time since the last SQLite
backup. PostgreSQL data written during the cut-over is NOT recoverable
back to SQLite.

---

## 5. Post-Migration Validation Checklist

| Check | Status | Command |
|-------|--------|---------|
| All tables exist | | `\dt` |
| Row counts match | | `SELECT count(*) FROM <table>;` |
| PK sequences are correct | | `SELECT max(id) FROM <table>;` then `ALTER SEQUENCE ...` |
| All indexes created | | `SELECT * FROM pg_indexes WHERE schemaname = 'public';` |
| FKs enforced | | `SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c WHERE c.contype = 'f';` |
| CHECK constraints applied | | `SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c WHERE c.contype = 'c';` |
| Connection pooling works | | `SELECT count(*) FROM pg_stat_activity WHERE application_name = '<app>';` |
| App queries respond < 100ms | | `curl -w '\n%{time_total}s\n' https://api/health` |
| Token blocklist queries work | | `SELECT count(*) FROM token_blocklist WHERE expires_at > now();` |
| JSONB queries work | | `SELECT * FROM service_partners WHERE address->>'city' = 'Nairobi';` |

---

## 6. PostgreSQL Production Tuning

### 6.1. Connection Pooling

On Render's managed PostgreSQL, PgBouncer is already enabled. The Flask
app is configured with:
- `pool_size=20`
- `max_overflow=0`
- `pool_pre_ping=True`
- `pool_recycle=1800` (30 minutes)

Monitor connections:
```sql
SELECT count(*) FROM pg_stat_activity;
-- If approaching the limit (20 on Hobby tier), increase pool_size
-- or enable PgBouncer's transaction pooling mode.
```

### 6.2. PostgreSQL Configuration (postgresql.conf)

For self-hosted PostgreSQL 16, tune these parameters in
`/var/lib/postgresql/data/postgresql.conf`:

```conf
# Connection settings
max_connections = 100
superuser_reserved_connections = 10

# Memory
shared_buffers = 256MB          # 25% of RAM
effective_cache_size = 1GB        # 50-75% of RAM
work_mem = 4MB
maintenance_work_mem = 128MB

# Write ahead log
wal_buffers = 16MB
checkpoint_completion_ratio = 0.9
wal_writer_delay = 200ms

# Query planner
random_page_cost = 1.1           # SSD storage
effective_io_concurrency = 200
default_statistics_target = 200

# Logging
log_min_duration_statement = 1000  # Log slow queries (>1s)
log_checkpoints = on
log_connections = on
log_disconnections = on
```

### 6.3. Query Optimization

Key queries that benefit from the new indexes:

```sql
-- Admin dashboard (was 6 separate queries, can be 1):
SELECT
    (SELECT count(*) FROM users) as total_users,
    (SELECT count(*) FROM services) as total_services,
    (SELECT count(*) FROM vehicles) as total_vehicles,
    (SELECT count(*) FROM appointments) as total_appointments,
    (SELECT count(*) FROM appointments WHERE status IN ('scheduled', 'confirmed')) as active,
    (SELECT count(*) FROM appointments WHERE status = 'completed') as completed,
    (SELECT COALESCE(SUM(total_amount), 0) FROM appointments WHERE payment_status = 'paid') as revenue;
```

```sql
-- Employee dashboard (N+1 fixed with eager loading in SQLAlchemy):
SELECT a.*, appt.appointment_date, appt.status as appt_status,
       u.name as customer_name, u.phone as customer_phone,
       v.make, v.model, s.name as service_name
FROM assignments a
JOIN appointments appt ON a.appointment_id = appt.id
JOIN users u ON appt.user_id = u.id
JOIN vehicles v ON appt.vehicle_id = v.id
JOIN services s ON appt.service_id = s.id
WHERE a.employee_id = :emp_id
ORDER BY a.assigned_at DESC;
```

---

## 7. Type Mapping Reference

| SQLite Type | PostgreSQL Type | SQLAlchemy | Notes |
|-------------|-----------------|------------|-------|
| INTEGER (PK) | BIGINT | `db.BigInteger` | Future-proof for >2.1B rows |
| TEXT | TEXT | `db.Text` | No change needed |
| VARCHAR(n) | VARCHAR(n) | `db.String(n)` | No change needed |
| DATETIME | TIMESTAMPTZ | `db.DateTime(timezone=True)` | Time zone-aware timestamps |
| JSON | JSONB | `db.JSONB` | Binary JSON, faster queries |
| BOOLEAN | BOOLEAN | `db.Boolean` | No change needed |
| NUMERIC(p,s) | NUMERIC(p,s) | `db.Numeric(p, s)` | No change needed |
| — | UUID | `db.String(36)` | `employee_id` column uses UUID v4 |

---

## 8. Known Issues & Mitigations

| Issue | Impact | Mitigation |
|-------|--------|-----------|
| SQLite `CHECK` constraints not transferred by pgloader | Data quality | Apply Alembic migration after import |
| SQLite FKs not enforced (no PRAGMA) | Orphaned rows | PostgreSQL enforces FKs with `ON DELETE CASCADE` |
| `datetime.utcnow()` returns naive datetime | Timezone confusion | Use `func.now()` with `server_default`; app uses UTC consistently |
| `card_number` stored in plaintext | PCI-DSS violation | Migration script hashes existing values; new code must encrypt |
| Synchronous `log_audit()` commits in request transaction | Lock contention | See audit.py — recommend async queue (Celery/RQ) in future sprint |
| `limiter` uses `memory://` storage | Lost on restart | Switch to Redis-backed storage in production |

---

## 9. References

- [PostgreSQL 16 Release Notes](https://www.postgresql.org/docs/16/release-16.html)
- [pgloader Documentation](https://pgloader.readthedocs.io/)
- [SQLAlchemy PostgreSQL Types](https://docs.sqlalchemy.org/en/latest/dialects/postgresql.html)
- [Flask-Limiter with Redis](https://flask-limiter.readthedocs.io/en/latest/storage.html#redis)
- [Render PostgreSQL Docs](https://render.com/docs/databases)

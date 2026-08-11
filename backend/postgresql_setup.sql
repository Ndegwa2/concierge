-- PostgreSQL Setup Script for Ndegwa Auto Concierge Platform
-- Run this once after creating the PostgreSQL 16 database
-- Execute as the postgres superuser, then connect as the app role:
--   \i postgresql_setup.sql

-- ============================================================================
-- PHASE 3: SECURITY & ACCESS CONTROL
-- Roles, Extensions, Row-Level Security, and Data Protection
-- ============================================================================

-- --------------------------------------------------------------------------
-- 3.1. EXTENSIONS
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- AES encryption, gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Trigram matching for ILIKE optimization
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- GiST support for exclusion constraints

-- --------------------------------------------------------------------------
-- 3.2. DATABASE-LEVEL ROLES (least-privilege model)
-- --------------------------------------------------------------------------
-- The "autoconcierge_app" role is used by the Flask application.
-- It has CONNECT on the database and USAGE on the public schema.
-- Tables are created by a migration role; the app role gets
-- SELECT/INSERT/UPDATE/DELETE grants per-table.

DO $$
BEGIN
    -- Application role: CRUD access only (no DDL)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'autoconcierge_app') THEN
        CREATE ROLE autoconcierge_app LOGIN PASSWORD 'your_secure_password_here';
    END IF;

    -- Read-only role for analytics / BI tools
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'autoconcierge_read') THEN
        CREATE ROLE autoconcierge_read NOLOGIN;
    END IF;

    -- Write role (granted to app)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'autoconcierge_write') THEN
        CREATE ROLE autoconcierge_write NOLOGIN;
    END IF;

    -- Migration role: DDL owner of all tables (used by alembic)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'autoconcierge_migrate') THEN
        CREATE ROLE autoconcierge_migrate LOGIN PASSWORD 'migrate_password_here' CREATEDB;
    END IF;
END $$;

-- Grant connect on database to app role
GRANT CONNECT ON DATABASE autoconcierge_prod TO autoconcierge_app;

-- Schema privileges
GRANT USAGE ON SCHEMA public TO autoconcierge_app;
GRANT USAGE ON SCHEMA public TO autoconcierge_migrate;

-- Assign roles
GRANT autoconcierge_read, autoconcierge_write TO autoconcierge_app;

-- --------------------------------------------------------------------------
-- 3.3. TABLE-LEVEL PRIVILEGES
-- Run AFTER all tables have been created by the Alembic migration.
-- This block assumes tables already exist via `flask db upgrade`.
-- --------------------------------------------------------------------------
-- GRANT SELECT on all tables to read-only
GRANT SELECT ON ALL TABLES IN SCHEMA public TO autoconcierge_read;
-- GRANT CRUD on all tables to write role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO autoconcierge_write;
-- GRANT usage on all sequences (for BigInteger auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO autoconcierge_write;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO autoconcierge_read;
-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO autoconcierge_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO autoconcierge_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO autoconcierge_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON SEQUENCES TO autoconcierge_read;

-- --------------------------------------------------------------------------
-- 3.4. ROW-LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------------
-- Enable RLS on tenant-scoped tables. The app currently uses role-based
-- access in the application layer, but RLS provides defence-in-depth.
-- The current_user_id() function reads "request.user_id" set via SET LOCAL.

-- Helper function: returns the application-level user ID set in the session
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS BIGINT AS $$
    SELECT current_setting('request.user_id', true)::BIGINT;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_current_role()
RETURNS TEXT AS $$
    SELECT current_setting('request.user_role', true);
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
$$ LANGUAGE plpgsql STABLE;

-- 3.4.1. appointments — customers see only their own; employees see assigned;
--   admins see all
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_customer_isolation" ON appointments
    FOR SELECT, UPDATE
    USING (
        user_id = get_current_user_id()
        OR get_current_role() IN ('admin', 'super_admin', 'employee')
    );

CREATE POLICY "appointments_insert_by_owner_or_admin" ON appointments
    FOR INSERT
    WITH CHECK (
        user_id = get_current_user_id()
        OR get_current_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "appointments_delete_by_owner_or_admin" ON appointments
    FOR DELETE
    USING (
        user_id = get_current_user_id()
        OR get_current_role() IN ('admin', 'super_admin')
    );

-- 3.4.2. vehicles — same pattern
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_owner_isolation" ON vehicles
    FOR SELECT, UPDATE, DELETE
    USING (
        user_id = get_current_user_id()
        OR get_current_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "vehicles_insert_by_owner_or_admin" ON vehicles
    FOR INSERT
    WITH CHECK (
        user_id = get_current_user_id()
        OR get_current_role() IN ('admin', 'super_admin')
    );

-- 3.4.3. payment_methods — customers see only their own
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_owner_isolation" ON payment_methods
    FOR ALL
    USING (
        user_id = get_current_user_id()
        OR get_current_role() IN ('admin', 'super_admin')
    )
    WITH CHECK (
        user_id = get_current_user_id()
        OR get_current_role() IN ('admin', 'super_admin')
    );

-- 3.4.4. notifications — customers see only their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_owner_isolation" ON notifications
    FOR SELECT, UPDATE
    USING (
        user_id = get_current_user_id()
        OR get_current_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "notifications_insert_by_admin" ON notifications
    FOR INSERT
    WITH CHECK (
        get_current_role() IN ('admin', 'super_admin', 'system')
    );

-- 3.4.5. token_blocklist — app-level only, no RLS needed but restrict
ALTER TABLE token_blocklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "token_blocklist_all_access" ON token_blocklist
    FOR ALL
    USING (true);

-- --------------------------------------------------------------------------
-- 3.5. SENSITIVE DATA ENCRYPTION (pgcrypto)
-- --------------------------------------------------------------------------

-- payment_methods.card_number: store as AES-encrypted value.
-- The application must call pgp_sym_encrypt / pgp_sym_decrypt with a key
-- stored in the vault or Render secret store.
-- Column already stores card_number; for new inserts the app should encrypt.
COMMENT ON COLUMN payment_methods.card_number IS
    'Store as AES-256 encrypted value via pgp_sym_encrypt(card_number, key). '
    'Never store plaintext card numbers.';

-- employees.bank_account_number: same approach
COMMENT ON COLUMN employees.bank_account_number IS
    'Store as AES-256 encrypted value via pgp_sym_encrypt(value, key).';

-- employees.health_plan_tier: mask on read — no encryption needed but
-- restrict column visibility via a VIEW for non-HR roles.
CREATE OR REPLACE VIEW employees_safe AS
    SELECT
        id, user_id, employee_id, location, specialties,
        rating, total_services, status, hired_at,
        department, title, employment_type, start_date,
        created_at, updated_at
    FROM employees;
-- Revoke direct table access; only the view is used by the app
-- REVOKE SELECT ON employees FROM autoconcierge_read;
-- GRANT SELECT ON employees_safe TO autoconcierge_read;

-- --------------------------------------------------------------------------
-- 3.6. AUDIT TRIGGER (automatic audit trail)
-- --------------------------------------------------------------------------
-- Creates an audit trigger on modified tables. For new deployments only;
-- existing data is already in audit_logs via the application-level audit utility.

CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT := get_current_user_id()::TEXT;
    v_role TEXT := get_current_role();
    v_ip TEXT := current_setting('request.ip_address', true);
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id,
                                new_values, ip_address, user_agent, status, created_at)
        VALUES (NULLIF(v_username, '')::BIGINT, 'INSERT', TG_TABLE_NAME, NEW.id,
                to_jsonb(NEW), v_ip, current_setting('request.user_agent', true),
                'success', now());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id,
                                old_values, new_values, ip_address, user_agent, status, created_at)
        VALUES (NULLIF(v_username, '')::BIGINT, 'UPDATE', TG_TABLE_NAME, NEW.id,
                to_jsonb(OLD), to_jsonb(NEW), v_ip, current_setting('request.user_agent', true),
                'success', now());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id,
                                old_values, ip_address, user_agent, status, created_at)
        VALUES (NULLIF(v_username, '')::BIGINT, 'DELETE', TG_TABLE_NAME, OLD.id,
                to_jsonb(OLD), v_ip, current_setting('request.user_agent', true),
                'success', now());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to the most sensitive tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN ('appointments', 'payment_methods', 'employees',
                            'users', 'discount_codes', 'service_partners')
    LOOP
        EXECUTE format('
            CREATE TRIGGER audit_trigger_%I
            AFTER INSERT OR UPDATE OR DELETE ON %I
            FOR EACH ROW
            WHEN (current_setting(''request.audit_enabled'', true) = ''on'')
            EXECUTE FUNCTION audit_trigger_fn()',
            r.tablename, r.tablename);
    END LOOP;
END $$;

-- --------------------------------------------------------------------------
-- 3.7. CONNECTION LIMITS
-- --------------------------------------------------------------------------
-- Limit total connections to avoid overwhelming the DB on Render's
-- shared PostgreSQL tier (max ~20 connections on the Hobby tier).
ALTER ROLE autoconcierge_app CONNECTION LIMIT 20;

-- --------------------------------------------------------------------------
-- 3.8. INDEX: GIN for JSONB search_vector on services
-- (Already created in the Alembic migration, included here for standalone setup)
-- --------------------------------------------------------------------------
-- CREATE INDEX IF NOT EXISTS ix_services_search ON services USING GIN (search_vector);
-- CREATE INDEX IF NOT EXISTS ix_service_partners_services_gin ON service_partners USING GIN (services_offered);
-- CREATE INDEX IF NOT EXISTS ix_service_partners_address_gin ON service_partners USING GIN (address);
-- CREATE INDEX IF NOT EXISTS ix_audit_logs_entity ON audit_logs (entity_type, entity_id);
-- CREATE INDEX IF NOT EXISTS ix_discount_codes_code_upper ON discount_codes (upper(code));
-- CREATE INDEX IF NOT EXISTS ix_token_blocklist_expires_at ON token_blocklist (expires_at);

-- ========================================================================
-- PHASE COMPLETE — run the Alembic migration next:
--   pip install -r requirements.txt
--   flask db upgrade
-- ========================================================================

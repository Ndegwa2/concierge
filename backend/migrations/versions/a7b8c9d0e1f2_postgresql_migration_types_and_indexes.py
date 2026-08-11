"""PostgreSQL migration: type changes, indexes, extensions, constraints

Revision ID: a7b8c9d0e1f2
Revises: e9b6627fde1e
Create Date: 2026-08-11 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a7b8c9d0e1f2'
down_revision = 'e9b6627fde1e'
branch_labels = None
depends_on = None


def is_postgres():
    bind = op.get_bind()
    return bind.dialect.name == 'postgresql'


def upgrade():
    if is_postgres():
        _upgrade_postgres()
    else:
        _upgrade_sqlite()


def _upgrade_postgres():
    # --- Enable extensions ---
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')

    # --- users ---
    op.alter_column('users', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('users', 'password_hash', existing_type=sa.String(128), type_=sa.String(255))
    op.alter_column('users', 'created_at', type_=sa.DateTime(timezone=True),
                    postgresql_using='created_at AT TIME ZONE \'UTC\'')
    op.alter_column('users', 'updated_at', type_=sa.DateTime(timezone=True),
                    postgresql_using='updated_at AT TIME ZONE \'UTC\'')
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_is_active', 'users', ['is_active'])
    op.create_index('ix_users_role', 'users', ['role'])

    # --- services ---
    op.alter_column('services', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.create_index('ix_services_category', 'services', ['category'])
    op.create_index('ix_services_is_active', 'services', ['is_active'])
    op.alter_column('services', 'created_at', type_=sa.DateTime(timezone=True))
    op.alter_column('services', 'updated_at', type_=sa.DateTime(timezone=True))

    # --- vehicles ---
    op.alter_column('vehicles', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('vehicles', 'user_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='user_id::bigint')
    op.alter_column('vehicles', 'created_at', type_=sa.DateTime(timezone=True))
    op.alter_column('vehicles', 'updated_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_vehicles_user_id', 'vehicles', ['user_id'])
    op.create_index('ix_vehicles_make_model', 'vehicles', ['make', 'model'])

    # --- appointments ---
    op.alter_column('appointments', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('appointments', 'user_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='user_id::bigint')
    op.alter_column('appointments', 'vehicle_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='vehicle_id::bigint')
    op.alter_column('appointments', 'service_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='service_id::bigint')
    op.alter_column('appointments', 'partner_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='partner_id::bigint')
    op.alter_column('appointments', 'appointment_date', type_=sa.DateTime(timezone=True),
                    postgresql_using='appointment_date AT TIME ZONE \'UTC\'')
    op.alter_column('appointments', 'created_at', type_=sa.DateTime(timezone=True),
                    postgresql_using='created_at AT TIME ZONE \'UTC\'')
    op.alter_column('appointments', 'updated_at', type_=sa.DateTime(timezone=True),
                    postgresql_using='updated_at AT TIME ZONE \'UTC\'')
    op.create_index('ix_appointments_user_id', 'appointments', ['user_id'])
    op.create_index('ix_appointments_vehicle_id', 'appointments', ['vehicle_id'])
    op.create_index('ix_appointments_service_id', 'appointments', ['service_id'])
    op.create_index('ix_appointments_partner_id', 'appointments', ['partner_id'])
    op.create_index('ix_appointments_status', 'appointments', ['status'])
    op.create_index('ix_appointments_appointment_date', 'appointments', ['appointment_date'])
    op.create_index('ix_appointments_payment_status', 'appointments', ['payment_status'])
    op.create_index('ix_appointments_user_status', 'appointments', ['user_id', 'status'])
    op.create_index('ix_appointments_status_date', 'appointments', ['status', 'appointment_date'])

    # --- service_history ---
    op.alter_column('service_history', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('service_history', 'user_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='user_id::bigint')
    op.alter_column('service_history', 'vehicle_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='vehicle_id::bigint')
    op.alter_column('service_history', 'service_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='service_id::bigint')
    op.alter_column('service_history', 'appointment_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='appointment_id::bigint')
    op.alter_column('service_history', 'completed_date', type_=sa.DateTime(timezone=True),
                    postgresql_using='completed_date AT TIME ZONE \'UTC\'')
    op.alter_column('service_history', 'created_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_service_history_user_id', 'service_history', ['user_id'])
    op.create_index('ix_service_history_vehicle_id', 'service_history', ['vehicle_id'])
    op.create_index('ix_service_history_service_id', 'service_history', ['service_id'])
    op.create_index('ix_service_history_appointment_id', 'service_history', ['appointment_id'])
    op.create_index('ix_service_history_completed_date', 'service_history', ['completed_date'])

    # --- notifications ---
    op.alter_column('notifications', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('notifications', 'user_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='user_id::bigint')
    op.alter_column('notifications', 'created_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    # Partial index: only index unread notifications for efficiency
    op.execute('CREATE INDEX IF NOT EXISTS ix_notifications_unread ON notifications (user_id) WHERE is_read = false')

    # --- admins ---
    op.alter_column('admins', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('admins', 'password_hash', existing_type=sa.String(128), type_=sa.String(255))
    op.alter_column('admins', 'created_at', type_=sa.DateTime(timezone=True))
    op.alter_column('admins', 'updated_at', type_=sa.DateTime(timezone=True))

    # --- payment_methods ---
    op.alter_column('payment_methods', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('payment_methods', 'user_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='user_id::bigint')
    op.alter_column('payment_methods', 'created_at', type_=sa.DateTime(timezone=True))
    op.alter_column('payment_methods', 'updated_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_payment_methods_user_id', 'payment_methods', ['user_id'])
    op.create_index('ix_payment_methods_is_default', 'payment_methods', ['is_default'])

    # --- discount_codes ---
    op.alter_column('discount_codes', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('discount_codes', 'start_date', type_=sa.DateTime(timezone=True),
                    postgresql_using='start_date AT TIME ZONE \'UTC\'')
    op.alter_column('discount_codes', 'end_date', type_=sa.DateTime(timezone=True),
                    postgresql_using='end_date AT TIME ZONE \'UTC\'')
    op.alter_column('discount_codes', 'created_at', type_=sa.DateTime(timezone=True))
    op.alter_column('discount_codes', 'updated_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_discount_codes_is_active', 'discount_codes', ['is_active'])
    op.execute('CREATE INDEX IF NOT EXISTS ix_discount_codes_code_upper ON discount_codes (upper(code))')

    # --- employees ---
    op.alter_column('employees', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('employees', 'user_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='user_id::bigint')
    op.alter_column('employees', 'manager_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='manager_id::bigint')

    # Convert specialties JSON -> JSONB
    op.alter_column('employees', 'specialties',
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    postgresql_using='specialties::jsonb')

    op.alter_column('employees', 'hired_at', type_=sa.DateTime(timezone=True),
                    postgresql_using='hired_at AT TIME ZONE \'UTC\'')
    op.alter_column('employees', 'start_date', type_=sa.DateTime(timezone=True),
                    postgresql_using='start_date AT TIME ZONE \'UTC\'')
    op.alter_column('employees', 'created_at', type_=sa.DateTime(timezone=True))
    op.alter_column('employees', 'updated_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_employees_user_id', 'employees', ['user_id'])
    op.create_index('ix_employees_employee_id', 'employees', ['employee_id'])
    op.create_index('ix_employees_status', 'employees', ['status'])
    op.create_index('ix_employees_department', 'employees', ['department'])
    op.create_index('ix_employees_employment_type', 'employees', ['employment_type'])
    op.create_index('ix_employees_account_status', 'employees', ['account_status'])
    op.create_index('ix_employees_manager_id', 'employees', ['manager_id'])

    # --- employee_documents ---
    op.alter_column('employee_documents', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('employee_documents', 'employee_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='employee_id::bigint')
    op.alter_column('employee_documents', 'uploaded_by', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='uploaded_by::bigint')
    op.alter_column('employee_documents', 'verified_at', type_=sa.DateTime(timezone=True))
    op.alter_column('employee_documents', 'created_at', type_=sa.DateTime(timezone=True))
    op.alter_column('employee_documents', 'updated_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_employee_documents_employee_id', 'employee_documents', ['employee_id'])
    op.create_index('ix_employee_documents_doc_type', 'employee_documents', ['doc_type'])
    op.create_index('ix_employee_documents_is_verified', 'employee_documents', ['is_verified'])

    # --- assignments ---
    op.alter_column('assignments', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('assignments', 'appointment_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='appointment_id::bigint')
    op.alter_column('assignments', 'employee_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='employee_id::bigint')
    op.alter_column('assignments', 'assigned_at', type_=sa.DateTime(timezone=True))
    op.alter_column('assignments', 'started_at', type_=sa.DateTime(timezone=True))
    op.alter_column('assignments', 'completed_at', type_=sa.DateTime(timezone=True))
    op.alter_column('assignments', 'created_at', type_=sa.DateTime(timezone=True))
    op.alter_column('assignments', 'updated_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_assignments_appointment_id', 'assignments', ['appointment_id'])
    op.create_index('ix_assignments_employee_id', 'assignments', ['employee_id'])
    op.create_index('ix_assignments_status', 'assignments', ['status'])
    op.create_index('ix_assignments_assigned_at', 'assignments', ['assigned_at'])
    op.create_index('ix_assignments_employee_status', 'assignments', ['employee_id', 'status'])

    # --- service_partners ---
    op.alter_column('service_partners', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')

    # Convert address and services_offered from JSON to JSONB
    op.alter_column('service_partners', 'address',
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    postgresql_using='address::jsonb')
    op.alter_column('service_partners', 'services_offered',
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    postgresql_using='services_offered::jsonb')

    op.alter_column('service_partners', 'created_at', type_=sa.DateTime(timezone=True))
    op.alter_column('service_partners', 'updated_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_service_partners_name', 'service_partners', ['name'])
    op.create_index('ix_service_partners_email', 'service_partners', ['email'])
    op.create_index('ix_service_partners_is_active', 'service_partners', ['is_active'])
    op.create_index('ix_service_partners_rating', 'service_partners', ['rating'])
    op.execute('CREATE INDEX IF NOT EXISTS ix_service_partners_services_gin ON service_partners USING GIN (services_offered)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_service_partners_address_gin ON service_partners USING GIN (address)')

    # --- audit_logs ---
    op.alter_column('audit_logs', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('audit_logs', 'user_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='user_id::bigint')
    op.alter_column('audit_logs', 'admin_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='admin_id::bigint')

    # Convert JSON columns to JSONB
    op.alter_column('audit_logs', 'old_values',
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    postgresql_using='old_values::jsonb')
    op.alter_column('audit_logs', 'new_values',
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    postgresql_using='new_values::jsonb')

    op.alter_column('audit_logs', 'created_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_admin_id', 'audit_logs', ['admin_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_entity_type', 'audit_logs', ['entity_type'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.execute('CREATE INDEX IF NOT EXISTS ix_audit_logs_entity ON audit_logs (entity_type, entity_id)')

    # --- system_metrics ---
    op.alter_column('system_metrics', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')

    # Convert extra_data JSON -> JSONB (add column if not exists, then drop old)
    op.execute('ALTER TABLE system_metrics ADD COLUMN IF NOT EXISTS extra_data_jsonb JSONB')
    op.execute('UPDATE system_metrics SET extra_data_jsonb = extra_data::jsonb WHERE extra_data IS NOT NULL')
    op.execute('ALTER TABLE system_metrics DROP COLUMN IF EXISTS extra_data')
    op.execute('ALTER TABLE system_metrics RENAME COLUMN extra_data_jsonb TO extra_data')

    op.alter_column('system_metrics', 'period_start', type_=sa.DateTime(timezone=True),
                    postgresql_using='period_start AT TIME ZONE \'UTC\'')
    op.alter_column('system_metrics', 'period_end', type_=sa.DateTime(timezone=True),
                    postgresql_using='period_end AT TIME ZONE \'UTC\'')
    op.alter_column('system_metrics', 'created_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_system_metrics_metric_type', 'system_metrics', ['metric_type'])
    op.create_index('ix_system_metrics_period_start', 'system_metrics', ['period_start'])
    op.execute('CREATE INDEX IF NOT EXISTS ix_system_metrics_extra_data_gin ON system_metrics USING GIN (extra_data)')

    # --- activity_tracker ---
    op.alter_column('activity_tracker', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('activity_tracker', 'user_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='user_id::bigint')
    op.alter_column('activity_tracker', 'admin_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='admin_id::bigint')

    # Convert activity_details JSON -> JSONB
    op.alter_column('activity_tracker', 'activity_details',
                    type_=postgresql.JSONB(astext_type=sa.Text()),
                    postgresql_using='activity_details::jsonb')

    op.alter_column('activity_tracker', 'created_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_activity_tracker_user_id', 'activity_tracker', ['user_id'])
    op.create_index('ix_activity_tracker_admin_id', 'activity_tracker', ['admin_id'])
    op.create_index('ix_activity_tracker_activity_type', 'activity_tracker', ['activity_type'])
    op.create_index('ix_activity_tracker_session_id', 'activity_tracker', ['session_id'])
    op.create_index('ix_activity_tracker_ip_address', 'activity_tracker', ['ip_address'])
    op.create_index('ix_activity_tracker_created_at', 'activity_tracker', ['created_at'])
    op.create_index('ix_activity_tracker_user_created', 'activity_tracker', ['user_id', 'created_at'])

    # --- invoices ---
    op.alter_column('invoices', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('invoices', 'appointment_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='appointment_id::bigint')
    op.alter_column('invoices', 'user_id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='user_id::bigint')
    op.alter_column('invoices', 'sent_at', type_=sa.DateTime(timezone=True))
    op.alter_column('invoices', 'created_at', type_=sa.DateTime(timezone=True))
    op.alter_column('invoices', 'updated_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_invoices_appointment_id', 'invoices', ['appointment_id'])
    op.create_index('ix_invoices_user_id', 'invoices', ['user_id'])
    op.create_index('ix_invoices_status', 'invoices', ['status'])

    # --- token_blocklist ---
    op.alter_column('token_blocklist', 'id', existing_type=sa.Integer(), type_=sa.BigInteger(),
                    postgresql_using='id::bigint')
    op.alter_column('token_blocklist', 'created_at', type_=sa.DateTime(timezone=True))
    op.alter_column('token_blocklist', 'expires_at', type_=sa.DateTime(timezone=True))
    op.create_index('ix_token_blocklist_expires_at', 'token_blocklist', ['expires_at'])

    # --- Full-text search on services ---
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS search_vector tsvector")
    op.execute("UPDATE services SET search_vector = setweight(to_tsvector('english', COALESCE(name, '')), 'A') || setweight(to_tsvector('english', COALESCE(description, '')), 'B')")
    op.execute("CREATE INDEX IF NOT EXISTS ix_services_search ON services USING GIN (search_vector)")
    op.execute("CREATE TRIGGER IF NOT EXISTS trg_services_search_update BEFORE INSERT OR UPDATE ON services FOR EACH ROW EXECUTE FUNCTION tsvector_update_trigger(search_vector, 'pg_catalog.english', name, description)")


def _upgrade_sqlite():
    indexes = [
        ('ix_users_email', 'users', ['email']),
        ('ix_users_is_active', 'users', ['is_active']),
        ('ix_users_role', 'users', ['role']),
        ('ix_services_category', 'services', ['category']),
        ('ix_services_is_active', 'services', ['is_active']),
        ('ix_vehicles_user_id', 'vehicles', ['user_id']),
        ('ix_vehicles_make_model', 'vehicles', ['make', 'model']),
        ('ix_appointments_user_id', 'appointments', ['user_id']),
        ('ix_appointments_vehicle_id', 'appointments', ['vehicle_id']),
        ('ix_appointments_service_id', 'appointments', ['service_id']),
        ('ix_appointments_partner_id', 'appointments', ['partner_id']),
        ('ix_appointments_status', 'appointments', ['status']),
        ('ix_appointments_appointment_date', 'appointments', ['appointment_date']),
        ('ix_appointments_payment_status', 'appointments', ['payment_status']),
        ('ix_appointments_user_status', 'appointments', ['user_id', 'status']),
        ('ix_appointments_status_date', 'appointments', ['status', 'appointment_date']),
        ('ix_service_history_user_id', 'service_history', ['user_id']),
        ('ix_service_history_vehicle_id', 'service_history', ['vehicle_id']),
        ('ix_service_history_service_id', 'service_history', ['service_id']),
        ('ix_service_history_appointment_id', 'service_history', ['appointment_id']),
        ('ix_service_history_completed_date', 'service_history', ['completed_date']),
        ('ix_notifications_user_id', 'notifications', ['user_id']),
        ('ix_notifications_is_read', 'notifications', ['is_read']),
        ('ix_payment_methods_user_id', 'payment_methods', ['user_id']),
        ('ix_payment_methods_is_default', 'payment_methods', ['is_default']),
        ('ix_discount_codes_is_active', 'discount_codes', ['is_active']),
        ('ix_employees_user_id', 'employees', ['user_id']),
        ('ix_employees_employee_id', 'employees', ['employee_id']),
        ('ix_employees_status', 'employees', ['status']),
        ('ix_employees_department', 'employees', ['department']),
        ('ix_employees_employment_type', 'employees', ['employment_type']),
        ('ix_employees_account_status', 'employees', ['account_status']),
        ('ix_employees_manager_id', 'employees', ['manager_id']),
        ('ix_employee_documents_employee_id', 'employee_documents', ['employee_id']),
        ('ix_employee_documents_doc_type', 'employee_documents', ['doc_type']),
        ('ix_employee_documents_is_verified', 'employee_documents', ['is_verified']),
        ('ix_assignments_appointment_id', 'assignments', ['appointment_id']),
        ('ix_assignments_employee_id', 'assignments', ['employee_id']),
        ('ix_assignments_status', 'assignments', ['status']),
        ('ix_assignments_assigned_at', 'assignments', ['assigned_at']),
        ('ix_assignments_employee_status', 'assignments', ['employee_id', 'status']),
        ('ix_service_partners_name', 'service_partners', ['name']),
        ('ix_service_partners_email', 'service_partners', ['email']),
        ('ix_service_partners_is_active', 'service_partners', ['is_active']),
        ('ix_service_partners_rating', 'service_partners', ['rating']),
        ('ix_audit_logs_user_id', 'audit_logs', ['user_id']),
        ('ix_audit_logs_admin_id', 'audit_logs', ['admin_id']),
        ('ix_audit_logs_action', 'audit_logs', ['action']),
        ('ix_audit_logs_entity_type', 'audit_logs', ['entity_type']),
        ('ix_audit_logs_created_at', 'audit_logs', ['created_at']),
        ('ix_system_metrics_metric_type', 'system_metrics', ['metric_type']),
        ('ix_system_metrics_period_start', 'system_metrics', ['period_start']),
        ('ix_activity_tracker_user_id', 'activity_tracker', ['user_id']),
        ('ix_activity_tracker_admin_id', 'activity_tracker', ['admin_id']),
        ('ix_activity_tracker_activity_type', 'activity_tracker', ['activity_type']),
        ('ix_activity_tracker_session_id', 'activity_tracker', ['session_id']),
        ('ix_activity_tracker_ip_address', 'activity_tracker', ['ip_address']),
        ('ix_activity_tracker_created_at', 'activity_tracker', ['created_at']),
        ('ix_activity_tracker_user_created', 'activity_tracker', ['user_id', 'created_at']),
        ('ix_invoices_appointment_id', 'invoices', ['appointment_id']),
        ('ix_invoices_user_id', 'invoices', ['user_id']),
        ('ix_invoices_status', 'invoices', ['status']),
        ('ix_token_blocklist_expires_at', 'token_blocklist', ['expires_at']),
    ]
    for idx_name, table, cols in indexes:
        try:
            op.create_index(idx_name, table, cols)
        except Exception:
            pass  # Index may already exist


def downgrade():
    indexes_to_drop = [
        'ix_users_email', 'ix_users_is_active', 'ix_users_role',
        'ix_services_category', 'ix_services_is_active', 'ix_services_search',
        'ix_vehicles_user_id', 'ix_vehicles_make_model',
        'ix_appointments_user_id', 'ix_appointments_vehicle_id', 'ix_appointments_service_id',
        'ix_appointments_partner_id', 'ix_appointments_status', 'ix_appointments_appointment_date',
        'ix_appointments_payment_status', 'ix_appointments_user_status', 'ix_appointments_status_date',
        'ix_service_history_user_id', 'ix_service_history_vehicle_id', 'ix_service_history_service_id',
        'ix_service_history_appointment_id', 'ix_service_history_completed_date',
        'ix_notifications_user_id', 'ix_notifications_is_read', 'ix_notifications_unread',
        'ix_payment_methods_user_id', 'ix_payment_methods_is_default',
        'ix_discount_codes_is_active', 'ix_discount_codes_code_upper',
        'ix_employees_user_id', 'ix_employees_employee_id', 'ix_employees_status',
        'ix_employees_department', 'ix_employees_employment_type', 'ix_employees_account_status',
        'ix_employees_manager_id',
        'ix_employee_documents_employee_id', 'ix_employee_documents_doc_type',
        'ix_employee_documents_is_verified',
        'ix_assignments_appointment_id', 'ix_assignments_employee_id', 'ix_assignments_status',
        'ix_assignments_assigned_at', 'ix_assignments_employee_status',
        'ix_service_partners_name', 'ix_service_partners_email', 'ix_service_partners_is_active',
        'ix_service_partners_rating', 'ix_service_partners_services_gin',
        'ix_service_partners_address_gin',
        'ix_audit_logs_user_id', 'ix_audit_logs_admin_id', 'ix_audit_logs_action',
        'ix_audit_logs_entity_type', 'ix_audit_logs_created_at', 'ix_audit_logs_entity',
        'ix_system_metrics_metric_type', 'ix_system_metrics_period_start',
        'ix_system_metrics_extra_data_gin',
        'ix_activity_tracker_user_id', 'ix_activity_tracker_admin_id',
        'ix_activity_tracker_activity_type', 'ix_activity_tracker_session_id',
        'ix_activity_tracker_ip_address', 'ix_activity_tracker_created_at',
        'ix_activity_tracker_user_created',
        'ix_invoices_appointment_id', 'ix_invoices_user_id', 'ix_invoices_status',
        'ix_token_blocklist_expires_at',
    ]
    for idx in indexes_to_drop:
        op.execute(f'DROP INDEX IF EXISTS {idx}')

    if is_postgres():
        op.execute('DROP TRIGGER IF EXISTS trg_services_search_update ON services')
        op.execute('ALTER TABLE services DROP COLUMN IF EXISTS search_vector')
        op.execute('DROP EXTENSION IF EXISTS "pg_trgm"')
        op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')
        op.execute('DROP EXTENSION IF EXISTS "pgcrypto"')

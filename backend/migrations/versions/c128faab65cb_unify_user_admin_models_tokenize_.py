"""unify user/admin models, tokenize payments, enable RLS and PII encryption

Revision ID: c128faab65cb
Revises: 1a2b3c4d5e6f
Create Date: 2026-08-19 16:11:29.729266

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c128faab65cb'
down_revision = '1a2b3c4d5e6f'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add is_admin to users
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=False))
        batch_op.create_index('ix_users_is_admin', ['is_admin'], unique=False)

    # 2. Migrate existing admins into users table (if any)
    op.execute("""
        INSERT INTO users (name, email, password_hash, role, is_active, is_admin)
        SELECT name, email, password_hash, role, true, true
        FROM admins
        WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE users.email = admins.email
        )
    """)

    # 3. Drop old FK constraints before updating admin_id references
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.drop_constraint('audit_logs_admin_id_fkey', type_='foreignkey')

    with op.batch_alter_table('activity_tracker', schema=None) as batch_op:
        batch_op.drop_constraint('activity_tracker_admin_id_fkey', type_='foreignkey')

    # 4. Migrate existing admin references to users (if any)
    op.execute("""
        UPDATE audit_logs
        SET admin_id = (
            SELECT users.id FROM users
            WHERE users.email = (SELECT admins.email FROM admins WHERE admins.id = audit_logs.admin_id)
        )
        WHERE admin_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM users WHERE users.email = (SELECT admins.email FROM admins WHERE admins.id = audit_logs.admin_id)
        )
    """)

    op.execute("""
        UPDATE activity_tracker
        SET admin_id = (
            SELECT users.id FROM users
            WHERE users.email = (SELECT admins.email FROM admins WHERE admins.id = activity_tracker.admin_id)
        )
        WHERE admin_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM users WHERE users.email = (SELECT admins.email FROM admins WHERE admins.id = activity_tracker.admin_id)
        )
    """)

    # 5. Recreate FK constraints pointing to users.id
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.create_foreign_key('audit_logs_admin_id_fkey', 'users', ['admin_id'], ['id'], ondelete='SET NULL')

    with op.batch_alter_table('activity_tracker', schema=None) as batch_op:
        batch_op.create_foreign_key('activity_tracker_admin_id_fkey', 'users', ['admin_id'], ['id'], ondelete='SET NULL')

    # 6. Drop admins table and its index
    with op.batch_alter_table('admins', schema=None) as batch_op:
        batch_op.drop_index('ix_admins_email')

    op.drop_table('admins')

    # 7. Payment method tokenization
    with op.batch_alter_table('payment_methods', schema=None) as batch_op:
        batch_op.add_column(sa.Column('payment_token', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('card_brand', sa.String(length=50), nullable=True))
        batch_op.drop_column('card_number')

    op.execute("ALTER TABLE payment_methods ALTER COLUMN expiry_date TYPE DATE USING expiry_date::date")

    # 8. Enable RLS on tenant-scoped tables
    op.execute('ALTER TABLE appointments ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE notifications ENABLE ROW LEVEL SECURITY')

    # 9. RLS policies for appointments
    op.execute('DROP POLICY IF EXISTS "appointments_customer_isolation" ON appointments')
    op.execute('DROP POLICY IF EXISTS "appointments_update_isolation" ON appointments')
    op.execute('DROP POLICY IF EXISTS "appointments_insert_by_owner_or_admin" ON appointments')
    op.execute('DROP POLICY IF EXISTS "appointments_delete_by_owner_or_admin" ON appointments')

    op.execute("""
        CREATE POLICY "appointments_customer_isolation" ON appointments
            FOR SELECT
            USING (
                user_id = get_current_user_id()
                OR get_current_role() IN ('admin', 'super_admin', 'employee')
            )
    """)
    op.execute("""
        CREATE POLICY "appointments_update_isolation" ON appointments
            FOR UPDATE
            USING (
                user_id = get_current_user_id()
                OR get_current_role() IN ('admin', 'super_admin', 'employee')
            )
    """)
    op.execute("""
        CREATE POLICY "appointments_insert_by_owner_or_admin" ON appointments
            FOR INSERT
            WITH CHECK (
                user_id = get_current_user_id()
                OR get_current_role() IN ('admin', 'super_admin')
            )
    """)
    op.execute("""
        CREATE POLICY "appointments_delete_by_owner_or_admin" ON appointments
            FOR DELETE
            USING (
                user_id = get_current_user_id()
                OR get_current_role() IN ('admin', 'super_admin')
            )
    """)

    # 10. RLS policies for vehicles
    op.execute('DROP POLICY IF EXISTS "vehicles_owner_isolation" ON vehicles')
    op.execute('DROP POLICY IF EXISTS "vehicles_update_isolation" ON vehicles')
    op.execute('DROP POLICY IF EXISTS "vehicles_delete_isolation" ON vehicles')
    op.execute('DROP POLICY IF EXISTS "vehicles_insert_by_owner_or_admin" ON vehicles')

    op.execute("""
        CREATE POLICY "vehicles_owner_isolation" ON vehicles
            FOR SELECT
            USING (
                user_id = get_current_user_id()
                OR get_current_role() IN ('admin', 'super_admin')
            )
    """)
    op.execute("""
        CREATE POLICY "vehicles_update_isolation" ON vehicles
            FOR UPDATE
            USING (
                user_id = get_current_user_id()
                OR get_current_role() IN ('admin', 'super_admin')
            )
    """)
    op.execute("""
        CREATE POLICY "vehicles_delete_isolation" ON vehicles
            FOR DELETE
            USING (
                user_id = get_current_user_id()
                OR get_current_role() IN ('admin', 'super_admin')
            )
    """)
    op.execute("""
        CREATE POLICY "vehicles_insert_by_owner_or_admin" ON vehicles
            FOR INSERT
            WITH CHECK (
                user_id = get_current_user_id()
                OR get_current_role() IN ('admin', 'super_admin')
            )
    """)

    # 11. RLS policies for payment_methods
    op.execute('DROP POLICY IF EXISTS "payment_methods_owner_isolation" ON payment_methods')

    op.execute("""
        CREATE POLICY "payment_methods_owner_isolation" ON payment_methods
            FOR ALL
            USING (
                user_id = get_current_user_id()
                OR get_current_role() IN ('admin', 'super_admin')
            )
            WITH CHECK (
                user_id = get_current_user_id()
                OR get_current_role() IN ('admin', 'super_admin')
            )
    """)

    # 12. RLS policies for notifications
    op.execute('DROP POLICY IF EXISTS "notifications_owner_isolation" ON notifications')
    op.execute('DROP POLICY IF EXISTS "notifications_update_isolation" ON notifications')
    op.execute('DROP POLICY IF EXISTS "notifications_insert_by_admin" ON notifications')

    op.execute("""
        CREATE POLICY "notifications_owner_isolation" ON notifications
            FOR SELECT
            USING (
                user_id = get_current_user_id()
                OR get_current_role() IN ('admin', 'super_admin')
            )
    """)
    op.execute("""
        CREATE POLICY "notifications_update_isolation" ON notifications
            FOR UPDATE
            USING (
                user_id = get_current_user_id()
                OR get_current_role() IN ('admin', 'super_admin')
            )
    """)
    op.execute("""
        CREATE POLICY "notifications_insert_by_admin" ON notifications
            FOR INSERT
            WITH CHECK (
                get_current_role() IN ('admin', 'super_admin', 'system')
            )
    """)


def downgrade():
    # Remove RLS policies
    op.execute('DROP POLICY IF EXISTS "notifications_insert_by_admin" ON notifications')
    op.execute('DROP POLICY IF EXISTS "notifications_update_isolation" ON notifications')
    op.execute('DROP POLICY IF EXISTS "notifications_owner_isolation" ON notifications')
    op.execute('DROP POLICY IF EXISTS "payment_methods_owner_isolation" ON payment_methods')
    op.execute('DROP POLICY IF EXISTS "vehicles_insert_by_owner_or_admin" ON vehicles')
    op.execute('DROP POLICY IF EXISTS "vehicles_delete_isolation" ON vehicles')
    op.execute('DROP POLICY IF EXISTS "vehicles_update_isolation" ON vehicles')
    op.execute('DROP POLICY IF EXISTS "vehicles_owner_isolation" ON vehicles')
    op.execute('DROP POLICY IF EXISTS "appointments_delete_by_owner_or_admin" ON appointments')
    op.execute('DROP POLICY IF EXISTS "appointments_insert_by_owner_or_admin" ON appointments')
    op.execute('DROP POLICY IF EXISTS "appointments_update_isolation" ON appointments')
    op.execute('DROP POLICY IF EXISTS "appointments_customer_isolation" ON appointments')

    op.execute('ALTER TABLE notifications DISABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE appointments DISABLE ROW LEVEL SECURITY')

    # Recreate admins table
    op.create_table('admins',
        sa.Column('id', sa.BIGINT(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=120), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), server_default='admin', nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id', name='admins_pkey')
    )
    with op.batch_alter_table('admins', schema=None) as batch_op:
        batch_op.create_index('ix_admins_email', ['email'], unique=True)

    # Restore audit_logs FK
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.drop_constraint('audit_logs_admin_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key('audit_logs_admin_id_fkey', 'admins', ['admin_id'], ['id'], ondelete='SET NULL')

    # Restore activity_tracker FK
    with op.batch_alter_table('activity_tracker', schema=None) as batch_op:
        batch_op.drop_constraint('activity_tracker_admin_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key('activity_tracker_admin_id_fkey', 'admins', ['admin_id'], ['id'], ondelete='SET NULL')

    # Restore payment_methods
    with op.batch_alter_table('payment_methods', schema=None) as batch_op:
        batch_op.add_column(sa.Column('card_number', sa.String(length=255), nullable=False))
        batch_op.alter_column('expiry_date',
               existing_type=sa.Date(),
               type_=sa.String(length=10),
               nullable=False)
        batch_op.drop_column('card_brand')
        batch_op.drop_column('payment_token')

    # Remove is_admin from users
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index('ix_users_is_admin')
        batch_op.drop_column('is_admin')

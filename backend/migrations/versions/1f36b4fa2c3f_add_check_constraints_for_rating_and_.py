"""Add CHECK constraints for rating and status fields

Revision ID: 1f36b4fa2c3f
Revises: 
Create Date: 2026-05-28 09:00:40.207515

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1f36b4fa2c3f'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Use batch mode for SQLite compatibility
    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.create_check_constraint('chk_appointment_status', "status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')")

    with op.batch_alter_table('employees', schema=None) as batch_op:
        batch_op.create_check_constraint('chk_employee_status', "status IN ('active', 'off-duty', 'suspended', 'terminated')")
        batch_op.create_check_constraint('chk_employee_rating', "rating >= 0.00 AND rating <= 5.00")

    with op.batch_alter_table('assignments', schema=None) as batch_op:
        batch_op.create_check_constraint('chk_assignment_status', "status IN ('assigned', 'in-progress', 'completed', 'cancelled')")

    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.create_check_constraint('chk_auditlog_status', "status IN ('success', 'failed', 'error')")

    with op.batch_alter_table('service_history', schema=None) as batch_op:
        batch_op.create_check_constraint('chk_servicehistory_rating', "rating >= 0 AND rating <= 5")

    with op.batch_alter_table('service_partners', schema=None) as batch_op:
        batch_op.create_check_constraint('chk_servicepartner_rating', "rating >= 0.00 AND rating <= 5.00")


def downgrade():
    # Drop constraints in reverse order using batch mode
    with op.batch_alter_table('service_partners', schema=None) as batch_op:
        batch_op.drop_constraint('chk_servicepartner_rating', type_='check')

    with op.batch_alter_table('service_history', schema=None) as batch_op:
        batch_op.drop_constraint('chk_servicehistory_rating', type_='check')

    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.drop_constraint('chk_auditlog_status', type_='check')

    with op.batch_alter_table('assignments', schema=None) as batch_op:
        batch_op.drop_constraint('chk_assignment_status', type_='check')

    with op.batch_alter_table('employees', schema=None) as batch_op:
        batch_op.drop_constraint('chk_employee_rating', type_='check')
        batch_op.drop_constraint('chk_employee_status', type_='check')

    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.drop_constraint('chk_appointment_status', type_='check')

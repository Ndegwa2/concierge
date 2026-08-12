"""Drop legacy employee status check constraint that blocked pending/rejected

The old chk_employee_status constraint only allowed:
  active, on_leave, inactive

But the application model and approval flow require:
  active, off-duty, suspended, terminated, pending, rejected

The newer employees_status_check constraint already covers the full set,
so we just need to remove the legacy conflicting constraint.

Revision ID: 18f3028a4ad7
Revises: a7b8c9d0e1f2
Create Date: 2026-08-12 09:12:20.192582

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '18f3028a4ad7'
down_revision = 'a7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('ALTER TABLE employees DROP CONSTRAINT IF EXISTS chk_employee_status')


def downgrade():
    with op.batch_alter_table('employees', schema=None) as batch_op:
        batch_op.create_check_constraint(
            'chk_employee_status',
            "status::text = ANY (ARRAY['active'::character varying, 'on_leave'::character varying, 'inactive'::character varying]::text[])"
        )

"""Repair users deactivated because of the off-duty bug

When an admin set an employee's status to 'off-duty' via
PUT /admin/employees/<id>/status, the buggy code also set
users.is_active = False. Off-duty is a shift state, not a
deactivated account, so we reactivate any user whose only
reason for deactivation is an off-duty employee status.

This migration is idempotent and only touches rows where
is_active = False and the linked employee row's status is
'off-duty'. It does not touch pending/rejected accounts
(which legitimately should be inactive).

Revision ID: b1c2d3e4f5a6
Revises: 9a8b7c6d5e4f
Create Date: 2026-09-01 02:30:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5a6'
down_revision = '9a8b7c6d5e4f'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        UPDATE users u
        SET is_active = TRUE
        FROM employees e
        WHERE e.user_id = u.id
          AND u.is_active = FALSE
          AND e.status = 'off-duty'
        """
    )


def downgrade():
    pass

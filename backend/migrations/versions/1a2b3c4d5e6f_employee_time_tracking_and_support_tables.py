"""Add employee time tracking, time-off, and issue reporting tables

Revision ID: 1a2b3c4d5e6f
Revises: e9b6627fde1e
Create Date: 2026-08-13 01:23:40.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1a2b3c4d5e6f'
down_revision = 'e9b6627fde1e'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('employee_time_logs',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('employee_id', sa.BigInteger(), nullable=False, index=True),
        sa.Column('action', sa.String(10), nullable=False),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.text('now()'), nullable=False, index=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_check_constraint('employee_time_logs_action_check', 'employee_time_logs', "action IN ('in', 'out')")

    op.create_table('time_off_requests',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('employee_id', sa.BigInteger(), nullable=False, index=True),
        sa.Column('request_type', sa.String(20), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False, index=True),
        sa.Column('end_date', sa.DateTime(), nullable=False, index=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), server_default='pending', nullable=False, index=True),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_check_constraint('time_off_requests_status_check', 'time_off_requests', "status IN ('pending', 'approved', 'rejected', 'cancelled')")
    op.create_check_constraint('time_off_requests_type_check', 'time_off_requests', "request_type IN ('vacation', 'sick', 'personal', 'other')")

    op.create_table('issue_reports',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('employee_id', sa.BigInteger(), nullable=False, index=True),
        sa.Column('appointment_id', sa.BigInteger(), nullable=True, index=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('priority', sa.String(20), server_default='medium', nullable=False, index=True),
        sa.Column('status', sa.String(20), server_default='open', nullable=False, index=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_check_constraint('issue_reports_priority_check', 'issue_reports', "priority IN ('low', 'medium', 'high', 'urgent')")
    op.create_check_constraint('issue_reports_status_check', 'issue_reports', "status IN ('open', 'in-progress', 'resolved', 'closed')")


def downgrade():
    op.drop_table('issue_reports')
    op.drop_table('time_off_requests')
    op.drop_table('employee_time_logs')

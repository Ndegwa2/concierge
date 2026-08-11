"""Add missing employee profile columns

Revision ID: e9b6627fde1e
Revises: 2a1b3c4d5e6f
Create Date: 2026-08-10 23:17:12.575769

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e9b6627fde1e'
down_revision = '2a1b3c4d5e6f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('employees', schema=None) as batch_op:
        batch_op.add_column(sa.Column('department', sa.String(100), nullable=True))
        batch_op.add_column(sa.Column('title', sa.String(100), nullable=True))
        batch_op.add_column(sa.Column('employment_type', sa.String(20), server_default='full_time', nullable=True))
        batch_op.add_column(sa.Column('start_date', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('manager_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('account_status', sa.String(20), server_default='onboarding', nullable=True))
        batch_op.add_column(sa.Column('exit_notes', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('offboarding_checklist_completed', sa.Boolean(), server_default=sa.false(), nullable=True))
        batch_op.add_column(sa.Column('base_salary', sa.Numeric(10, 2), nullable=True))
        batch_op.add_column(sa.Column('hourly_rate', sa.Numeric(10, 2), nullable=True))
        batch_op.add_column(sa.Column('pay_frequency', sa.String(20), nullable=True))
        batch_op.add_column(sa.Column('bank_account_number', sa.String(50), nullable=True))
        batch_op.add_column(sa.Column('bank_name', sa.String(100), nullable=True))
        batch_op.add_column(sa.Column('health_plan_tier', sa.String(20), nullable=True))

    with op.batch_alter_table('employees', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_employees_manager_id', 'employees', ['manager_id'], ['id'])


def downgrade():
    with op.batch_alter_table('employees', schema=None) as batch_op:
        batch_op.drop_constraint('fk_employees_manager_id', type_='foreignkey')
        batch_op.drop_column('health_plan_tier')
        batch_op.drop_column('bank_name')
        batch_op.drop_column('bank_account_number')
        batch_op.drop_column('pay_frequency')
        batch_op.drop_column('hourly_rate')
        batch_op.drop_column('base_salary')
        batch_op.drop_column('offboarding_checklist_completed')
        batch_op.drop_column('exit_notes')
        batch_op.drop_column('account_status')
        batch_op.drop_column('manager_id')
        batch_op.drop_column('start_date')
        batch_op.drop_column('employment_type')
        batch_op.drop_column('title')
        batch_op.drop_column('department')

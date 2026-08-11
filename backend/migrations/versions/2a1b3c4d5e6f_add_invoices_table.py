"""add invoices table

Revision ID: 2a1b3c4d5e6f
Revises: 1f36b4fa2c3f
Create Date: 2026-08-07 12:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2a1b3c4d5e6f'
down_revision = '1f36b4fa2c3f'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_number', sa.String(length=50), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('pdf_path', sa.String(length=255)),
        sa.Column('sent_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invoices_id'), 'invoices', ['id'], unique=False)
    op.create_unique_constraint(None, 'invoices', ['invoice_number'])

    with op.batch_alter_table('invoices', schema=None) as batch_op:
        batch_op.create_check_constraint('chk_invoice_status', "status IN ('draft', 'sent', 'paid', 'void')")


def downgrade():
    with op.batch_alter_table('invoices', schema=None) as batch_op:
        batch_op.drop_constraint('chk_invoice_status', type_='check')

    op.drop_constraint(None, 'invoices', type_='unique')
    op.drop_index(op.f('ix_invoices_id'), table_name='invoices')
    op.drop_table('invoices')

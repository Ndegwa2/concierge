"""extend invoice for pos verification workflow

Adds processed_by_user_id / verified_by_user_id / verified_at /
payment_method columns on Invoice, widens status to include
'pending_verification' and 'verified', and tightens invoice_type.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '67c456288282'
down_revision = '7e8cc92731ff'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('invoices', schema=None) as batch_op:
        batch_op.add_column(sa.Column('processed_by_user_id', sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column('verified_by_user_id', sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('payment_method', sa.String(length=20), nullable=True))

        batch_op.alter_column(
            'status',
            existing_type=sa.VARCHAR(length=20),
            type_=sa.String(length=32),
            existing_nullable=False,
        )

        batch_op.create_index(batch_op.f('ix_invoices_processed_by_user_id'), ['processed_by_user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_invoices_verified_by_user_id'), ['verified_by_user_id'], unique=False)
        batch_op.create_index('ix_invoices_status_created', ['status', 'created_at'], unique=False)

        batch_op.create_foreign_key(
            'fk_invoices_processed_by_user_id_users',
            'users', ['processed_by_user_id'], ['id'], ondelete='SET NULL',
        )
        batch_op.create_foreign_key(
            'fk_invoices_verified_by_user_id_users',
            'users', ['verified_by_user_id'], ['id'], ondelete='SET NULL',
        )


def downgrade():
    with op.batch_alter_table('invoices', schema=None) as batch_op:
        batch_op.drop_constraint('fk_invoices_processed_by_user_id_users', type_='foreignkey')
        batch_op.drop_constraint('fk_invoices_verified_by_user_id_users', type_='foreignkey')

        batch_op.drop_index('ix_invoices_status_created')
        batch_op.drop_index(batch_op.f('ix_invoices_verified_by_user_id'))
        batch_op.drop_index(batch_op.f('ix_invoices_processed_by_user_id'))

        batch_op.alter_column(
            'status',
            existing_type=sa.String(length=32),
            type_=sa.VARCHAR(length=20),
            existing_nullable=False,
        )

        batch_op.drop_column('payment_method')
        batch_op.drop_column('verified_at')
        batch_op.drop_column('verified_by_user_id')
        batch_op.drop_column('processed_by_user_id')
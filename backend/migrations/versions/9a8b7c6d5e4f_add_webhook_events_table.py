"""Add webhook_events table for async M-Pesa Daraja callback processing

Stores raw inbound webhook payloads with an UNPROCESSED state. The HTTP
route returns 200 immediately after persisting; a Celery worker picks
the event up and applies the business logic. A unique constraint on
(source, external_event_id) provides idempotency against retried
deliveries from upstream providers like Safaricom.

Revision ID: 9a8b7c6d5e4f
Revises: 18f3028a4ad7
Create Date: 2026-09-01 01:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '9a8b7c6d5e4f'
down_revision = '18f3028a4ad7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'webhook_events',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('source', sa.String(length=30), nullable=False),
        sa.Column('external_event_id', sa.String(length=200), nullable=False),
        sa.Column('payload', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='unprocessed'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('unprocessed', 'processing', 'processed', 'failed')"),
        sa.CheckConstraint("source IN ('mpesa', 'card', 'bank_transfer', 'other')"),
        sa.UniqueConstraint('source', 'external_event_id', name='uq_webhook_events_source_event'),
    )
    op.create_index('ix_webhook_events_source', 'webhook_events', ['source'])
    op.create_index('ix_webhook_events_external_event_id', 'webhook_events', ['external_event_id'])
    op.create_index('ix_webhook_events_status', 'webhook_events', ['status'])


def downgrade():
    op.drop_index('ix_webhook_events_status', table_name='webhook_events')
    op.drop_index('ix_webhook_events_external_event_id', table_name='webhook_events')
    op.drop_index('ix_webhook_events_source', table_name='webhook_events')
    op.drop_table('webhook_events')

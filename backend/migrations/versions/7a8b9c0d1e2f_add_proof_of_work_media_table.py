"""Add proof_of_work_media table for employee work-gallery uploads

Stores images/video uploaded by employees as proof of work on an assignment
(a job done for a specific client). Media is visibility-scoped at the service
layer: employees/admins see everything; a customer only sees media for work
done on their own appointments (denormalised client_id column).

The upgrade is guarded by an ``inspect`` check because ``create_app`` runs
``db.create_all()`` at import time (which would otherwise create the table
before Alembic runs). The guard keeps the migration idempotent in both local
dev and production deploy.

Revision ID: 7a8b9c0d1e2f
Revises: 67c456288282
Create Date: 2026-09-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '7a8b9c0d1e2f'
down_revision = '67c456288282'
branch_labels = None
depends_on = None

TABLE = 'proof_of_work_media'


def _table_exists():
    bind = op.get_bind()
    insp = inspect(bind)
    return TABLE in insp.get_table_names()


def upgrade():
    if _table_exists():
        return

    op.create_table(
        TABLE,
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('assignment_id', sa.BigInteger(),
                  sa.ForeignKey('assignments.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('client_id', sa.BigInteger(),
                  sa.ForeignKey('users.id', ondelete='SET NULL'),
                  nullable=True),
        sa.Column('uploaded_by', sa.BigInteger(),
                  sa.ForeignKey('users.id', ondelete='SET NULL'),
                  nullable=True),
        sa.Column('media_type', sa.String(length=10), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('thumbnail_path', sa.String(length=500), nullable=True),
        sa.Column('poster_path', sa.String(length=500), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.CheckConstraint("media_type IN ('image', 'video')"),
        sa.CheckConstraint(
            "mime_type IN ('image/jpeg','image/png','image/webp','image/gif',"
            "'image/heic','image/heif','video/mp4','video/webm','video/quicktime')"
        ),
        sa.UniqueConstraint('file_path', name='uq_proof_of_work_file_path'),
    )
    op.create_index('ix_pofw_assignment_id', TABLE, ['assignment_id'])
    op.create_index('ix_pofw_client_id', TABLE, ['client_id'])
    op.create_index('ix_pofw_uploaded_by', TABLE, ['uploaded_by'])
    op.create_index('ix_pofw_mime_type', TABLE, ['mime_type'])
    op.create_index('ix_pofw_created_at', TABLE, ['created_at'])
    op.create_index('ix_pofw_public', TABLE, ['is_public'])


def downgrade():
    if not _table_exists():
        return
    op.drop_index('ix_pofw_public', table_name=TABLE)
    op.drop_index('ix_pofw_created_at', table_name=TABLE)
    op.drop_index('ix_pofw_mime_type', table_name=TABLE)
    op.drop_index('ix_pofw_uploaded_by', table_name=TABLE)
    op.drop_index('ix_pofw_client_id', table_name=TABLE)
    op.drop_index('ix_pofw_assignment_id', table_name=TABLE)
    op.drop_constraint('uq_proof_of_work_file_path', TABLE, type_='unique')
    op.drop_table(TABLE)

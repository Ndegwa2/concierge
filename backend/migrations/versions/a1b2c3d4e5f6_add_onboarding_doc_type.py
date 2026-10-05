"""add 'onboarding' to documents.doc_type check constraint

Revision ID: a1b2c3d4e5f6
Revises: fd2f12efb061
Create Date: 2025-09-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'fd2f12efb061'
branch_labels = None
depends_on = None


def upgrade():
    # Re-create the documents.doc_type check constraint with the added
    # 'onboarding' value so that onboarding documents created during
    # customer registration are accepted by the database (not just the model).
    with op.batch_alter_table('documents', schema=None) as batch_op:
        try:
            batch_op.drop_constraint('documents_doc_type_check', type_='check')
        except Exception:
            pass  # constraint may already have been dropped
        batch_op.create_check_constraint(
            'documents_doc_type_check',
            "doc_type IN ('work_order', 'service_agreement', 'invoice', 'other', 'onboarding')",
        )


def downgrade():
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.drop_constraint('documents_doc_type_check', type_='check')
        batch_op.create_check_constraint(
            'documents_doc_type_check',
            "doc_type IN ('work_order', 'service_agreement', 'invoice', 'other')",
        )
"""
ChatImage model for AutoConcierge.

Stores image attachments uploaded through the AI chat interface.  Files live on
disk beneath a dedicated upload folder; the database records metadata only.
Access is scoped to the owning user so one customer cannot enumerate another's
images by guessing IDs.
"""
from app import db
from app.core.types import BigId
from sqlalchemy import func, CheckConstraint, Index


class ChatImage(db.Model):
    """An image attachment uploaded by a user in the AI chat."""

    __tablename__ = 'chat_images'
    __table_args__ = (
        CheckConstraint(
            "mime_type IN ('image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif')",
            name='ck_chat_images_mime_type',
        ),
        Index('ix_chat_images_user_id', 'user_id'),
        Index('ix_chat_images_created_at', 'created_at'),
    )

    id = db.Column(BigId, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.BigInteger,
        db.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
    )
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False, unique=True)
    file_size = db.Column(db.Integer, nullable=True)
    mime_type = db.Column(db.String(100), nullable=False)
    width = db.Column(db.Integer, nullable=True)
    height = db.Column(db.Integer, nullable=True)
    alt_text = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'width': self.width,
            'height': self.height,
            'alt_text': self.alt_text,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

from app import db
from sqlalchemy import func, CheckConstraint, Index


class ProofOfWorkMedia(db.Model):
    """Media (images/video) uploaded by employees as proof of work on an
    assignment (a job done for a specific client).

    Visibility is enforced at the service layer, not the DB: every employee
    and admin can see everything; a customer can only see media for work done
    on their own appointments (``client_id`` == their user id).
    """

    __tablename__ = 'proof_of_work_media'
    __table_args__ = (
        CheckConstraint("media_type IN ('image', 'video')"),
        CheckConstraint(
            "mime_type IN ('image/jpeg','image/png','image/webp','image/gif',"
            "'image/heic','image/heif','video/mp4','video/webm','video/quicktime')"
        ),
        Index('ix_pofw_assignment_id', 'assignment_id'),
        Index('ix_pofw_client_id', 'client_id'),
        Index('ix_pofw_uploaded_by', 'uploaded_by'),
        Index('ix_pofw_mime_type', 'mime_type'),
        Index('ix_pofw_created_at', 'created_at'),
        Index('ix_pofw_public', 'is_public'),
    )

    id = db.Column(db.BigInteger, primary_key=True)
    assignment_id = db.Column(
        db.BigInteger, db.ForeignKey('assignments.id', ondelete='CASCADE'),
        nullable=False, index=True,
    )
    # Denormalised owner of the appointment the work was done for. Storing this
    # makes the per-customer visibility filter a single indexed predicate and
    # keeps media visible even if the appointment is later reassigned/deleted.
    client_id = db.Column(
        db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'),
        index=True,
    )
    uploaded_by = db.Column(
        db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), index=True,
    )
    media_type = db.Column(db.String(10), nullable=False)
    mime_type = db.Column(db.String(100), nullable=False, index=True)
    original_filename = db.Column(db.String(255), nullable=False)
    # Storage-relative names (e.g. "a1b2...jpg", "thumbs/a1b2.webp").
    file_path = db.Column(db.String(500), nullable=False, unique=True)
    thumbnail_path = db.Column(db.String(500))
    poster_path = db.Column(db.String(500))
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    duration_seconds = db.Column(db.Integer)
    file_size = db.Column(db.Integer)
    caption = db.Column(db.Text)
    is_public = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    assignment = db.relationship(
        'Assignment', backref=db.backref('proof_of_work_media', lazy='dynamic'),
        lazy='joined',
    )

    def to_dict(self):
        return {
            'id': self.id,
            'assignment_id': self.assignment_id,
            'client_id': self.client_id,
            'uploaded_by': self.uploaded_by,
            'media_type': self.media_type,
            'mime_type': self.mime_type,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'width': self.width,
            'height': self.height,
            'duration_seconds': self.duration_seconds,
            'caption': self.caption,
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

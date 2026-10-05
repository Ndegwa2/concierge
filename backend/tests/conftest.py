"""Shared pytest fixtures.

The application factory reads configuration from the environment, so the test
environment is set up *before* ``app`` is imported.
"""
import os
import base64
import uuid

import pytest

os.environ.setdefault('FLASK_ENV', 'testing')
os.environ.setdefault('SECRET_KEY', 'test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'test-jwt-secret-key')
os.environ.setdefault(
    'ENCRYPTION_KEY',
    base64.urlsafe_b64encode(b'0' * 32).decode(),
)
os.environ.setdefault('PHONE_TOKEN_PEPPER', 'test-pepper')
os.environ.setdefault('DATABASE_URL', 'sqlite+pysqlite:///:memory:')
os.environ.setdefault('RATELIMIT_STORAGE_URI', 'memory://')
os.environ.setdefault('RATELIMIT_ENABLED', 'false')
os.environ.setdefault('AUTO_INIT_DB', 'false')
os.environ.setdefault(
    'CHAT_IMAGE_UPLOAD_FOLDER',
    os.path.join(os.getcwd(), 'uploads', 'chat_images_test'),
)

from app import create_app, db, limiter  # noqa: E402
from app.services.auth.models import User  # noqa: E402


@pytest.fixture(scope='session')
def app():
    application = create_app()
    application.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=os.environ['DATABASE_URL'],
        # Rate limits would otherwise make repeated auth calls flaky.
        RATELIMIT_ENABLED=False,
        CHAT_IMAGE_UPLOAD_FOLDER=os.environ['CHAT_IMAGE_UPLOAD_FOLDER'],
    )
    limiter.enabled = False

    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def _clean_tables(app):
    """Roll back anything a test wrote so cases stay independent."""
    yield
    db.session.rollback()
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()


def _make_user(role='customer', password='CorrectHorse1', **overrides):
    user = User()
    user.name = overrides.get('name', f'Test {role}')
    user.email = overrides.get('email', f'{role}-{uuid.uuid4().hex[:8]}@example.com')
    user.set_password(password)
    user.role = role
    user.is_admin = role in ('admin', 'super_admin')
    user.is_active = True
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture()
def make_user():
    return _make_user


@pytest.fixture()
def auth_headers(app):
    """Build an Authorization header for a given user."""
    from flask_jwt_extended import create_access_token

    def _headers(user):
        token = create_access_token(
            identity=str(user.id),
            additional_claims={'role': user.role},
        )
        return {'Authorization': f'Bearer {token}'}

    return _headers

"""Tests for customer registration with onboarding document uploads.

Covers the multipart/form-data registration path introduced to allow customers
to upload onboarding documents during sign-up.  The uploaded docs are expected
to be saved on disk, a ``Document`` row created for each valid file, and the
``send_customer_onboarding_email`` Celery task queued with the resulting
``document_ids``.
"""
import io
import os
from unittest.mock import patch

import pytest

from app import db
from app.services.auth.models import User
from app.services.documents.models import Document


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_file(content: bytes, filename: str):
    """Return a ``(BytesIO, filename)`` tuple for the Flask test client."""
    return (io.BytesIO(content), filename)


def _valid_pdf(filename='doc1.pdf'):
    return _make_file(b'%PDF-1.4 fake pdf content', filename)


def _valid_png(filename='photo.png'):
    return _make_file(b'\x89PNG\r\n\x1a\n' + b'\x00' * 32, filename)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _patch_upload_dir(app, tmp_path):
    """Redirect file uploads to a temp dir so tests don't pollute the workspace."""
    upload_dir = tmp_path / 'uploads'
    upload_dir.mkdir()
    app.config['DOCUMENT_UPLOAD_FOLDER'] = str(upload_dir)
    yield
    app.config['DOCUMENT_UPLOAD_FOLDER'] = 'uploads/documents'


@pytest.fixture(autouse=True)
def _patch_celery():
    """Mock the Celery onboarding email task so tests don't hit Redis."""
    with patch('app.tasks.email_tasks.send_customer_onboarding_email') as mock_task:
        yield mock_task


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestRegistrationWithOnboardingDocuments:
    """End-to-end tests for the /api/auth/register multipart path."""

    def test_customer_registration_with_valid_document(self, client, _patch_celery):
        """A valid PDF is saved, a Document row is created, and the email
        task is queued with the new document id."""
        response = client.post(
            '/api/auth/register',
            data={
                'name': 'Jane Doe',
                'email': 'jane@example.com',
                'password': 'SecurePass1',
                'role': 'customer',
                'onboarding_documents': _valid_pdf(),
            },
            content_type='multipart/form-data',
        )

        assert response.status_code == 201
        body = response.get_json()
        assert body['success'] is True
        assert body['data']['access_token'] is not None

        # Document should have been persisted.
        docs = Document.query.filter_by(doc_type='onboarding').all()
        assert len(docs) == 1
        assert docs[0].created_by == body['data']['user']['id']

        # Email task should have been called with the document id.
        call_args = _patch_celery.delay.call_args
        assert call_args is not None
        user_id_arg = call_args[0][0]
        document_ids_kwarg = call_args[1].get('document_ids')
        assert document_ids_kwarg == [docs[0].id]
    def test_customer_registration_without_documents_json(self, client, _patch_celery):
        """JSON registration (no files) still works — backward compatible."""
        response = client.post(
            '/api/auth/register',
            json={
                'name': 'John Smith',
                'email': 'john@example.com',
                'password': 'SecurePass1',
                'role': 'customer',
            },
        )

        assert response.status_code == 201
        body = response.get_json()
        assert body['success'] is True

        # No documents should exist.
        assert Document.query.count() == 0

        # Email task called with document_ids=None.
        call_args = _patch_celery.delay.call_args
        assert call_args is not None
        assert call_args[1].get('document_ids') is None

    def test_customer_registration_without_documents_multipart(self, client, _patch_celery):
        """Multipart registration *without* files also works."""
        response = client.post(
            '/api/auth/register',
            data={
                'name': 'Mary Jones',
                'email': 'mary@example.com',
                'password': 'SecurePass1',
                'role': 'customer',
            },
            content_type='multipart/form-data',
        )

        assert response.status_code == 201
        body = response.get_json()
        assert body['success'] is True
        assert Document.query.count() == 0

        call_args = _patch_celery.delay.call_args
        assert call_args[1].get('document_ids') is None
    def test_multiple_valid_documents_all_saved(self, client, _patch_celery):
        """Multiple valid files are all persisted and passed to the email task."""
        response = client.post(
            '/api/auth/register',
            data={
                'name': 'Bob Multi',
                'email': 'bob@example.com',
                'password': 'SecurePass1',
                'role': 'customer',
                'onboarding_documents': [
                    _valid_pdf('doc1.pdf'),
                    _valid_png('photo.png'),
                ],
            },
            content_type='multipart/form-data',
        )

        assert response.status_code == 201

        docs = Document.query.filter_by(doc_type='onboarding').all()
        assert len(docs) == 2

        call_args = _patch_celery.delay.call_args
        document_ids = call_args[1].get('document_ids')
        assert document_ids is not None
        assert len(document_ids) == 2
        assert set(document_ids) == {d.id for d in docs}

    def test_invalid_extension_document_is_skipped(self, client, _patch_celery):
        """A file with a disallowed extension is skipped; registration succeeds."""
        response = client.post(
            '/api/auth/register',
            data={
                'name': 'Eve Badfile',
                'email': 'eve@example.com',
                'password': 'SecurePass1',
                'role': 'customer',
                'onboarding_documents': _make_file(b'MZ...', 'malware.exe'),
            },
            content_type='multipart/form-data',
        )

        assert response.status_code == 201
        body = response.get_json()
        assert body['success'] is True

        # No documents saved.
        assert Document.query.count() == 0

        # Email task called with document_ids=None (empty list -> None).
        call_args = _patch_celery.delay.call_args
        document_ids = call_args[1].get('document_ids')
        assert not document_ids
    def test_employee_registration_ignores_documents(self, client, _patch_celery):
        """Employee registration does not process uploaded documents."""
        response = client.post(
            '/api/auth/register',
            data={
                'name': 'Emp Worker',
                'email': 'emp@example.com',
                'password': 'SecurePass1',
                'role': 'employee',
                'location': 'Nairobi CBD',
                'onboarding_documents': _valid_pdf(),
            },
            content_type='multipart/form-data',
        )

        assert response.status_code == 201
        body = response.get_json()
        assert body['success'] is True
        assert body['data'].get('requires_approval') is True

        # No documents saved for employee registrations.
        assert Document.query.count() == 0

        # Onboarding email task should not be invoked.
        _patch_celery.delay.assert_not_called()

    def test_registration_still_returns_tokens(self, client, _patch_celery):
        """Customer registration response includes access & refresh tokens."""
        response = client.post(
            '/api/auth/register',
            json={
                'name': 'Token Test',
                'email': 'token@example.com',
                'password': 'SecurePass1',
                'role': 'customer',
            },
        )

        assert response.status_code == 201
        body = response.get_json()
        assert body['data']['access_token']
        assert body['data']['refresh_token']

    def test_user_created_with_correct_role(self, client, _patch_celery):
        """The created user has the 'customer' role and is active."""
        response = client.post(
            '/api/auth/register',
            data={
                'name': 'Role Check',
                'email': 'rolecheck@example.com',
                'password': 'SecurePass1',
                'role': 'customer',
            },
            content_type='multipart/form-data',
        )

        assert response.status_code == 201
        user = User.query.filter_by(email='rolecheck@example.com').first()
        assert user is not None
        assert user.role == 'customer'
        assert user.is_active is True

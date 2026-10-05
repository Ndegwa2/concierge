"""Regression tests for finding C4 - IDOR / signature forgery in /api/documents.

Before the fix every endpoint carried only `@jwt_required()`, so any logged-in
user could read, edit, audit, cancel and *sign* any other user's document by
walking the id space.
"""
import pytest

from app import db
from app.services.documents.models import Document


@pytest.fixture()
def owner(make_user):
    return make_user(role='customer', email='owner@example.com')


@pytest.fixture()
def stranger(make_user):
    return make_user(role='customer', email='stranger@example.com')


@pytest.fixture()
def document(owner):
    doc = Document(
        title='Service Agreement',
        doc_type='service_agreement',
        description='Private terms',
        status='sent',
        created_by=owner.id,
    )
    db.session.add(doc)
    db.session.commit()
    return doc


class TestDocumentRead:
    def test_stranger_cannot_read_document(self, client, document, stranger, auth_headers):
        response = client.get(f'/api/documents/{document.id}', headers=auth_headers(stranger))
        assert response.status_code in (403, 404)

    def test_owner_can_read_document(self, client, document, owner, auth_headers):
        response = client.get(f'/api/documents/{document.id}', headers=auth_headers(owner))
        assert response.status_code == 200
        assert response.get_json()['data']['title'] == 'Service Agreement'

    def test_admin_can_read_document(self, client, document, make_user, auth_headers):
        admin = make_user(role='admin')
        response = client.get(f'/api/documents/{document.id}', headers=auth_headers(admin))
        assert response.status_code == 200

    def test_stranger_cannot_read_audit_trail(self, client, document, stranger, auth_headers):
        response = client.get(f'/api/documents/{document.id}/audit', headers=auth_headers(stranger))
        assert response.status_code in (403, 404)

    def test_stranger_cannot_list_signatures(self, client, document, stranger, auth_headers):
        response = client.get(
            f'/api/documents/{document.id}/signatures', headers=auth_headers(stranger)
        )
        assert response.status_code in (403, 404)

    def test_listing_is_scoped_to_the_caller(self, client, document, stranger, auth_headers):
        response = client.get('/api/documents/', headers=auth_headers(stranger))
        assert response.status_code == 200
        ids = [d['id'] for d in response.get_json()['data']]
        assert document.id not in ids


class TestDocumentMutation:
    def test_stranger_cannot_update_document(self, client, document, stranger, auth_headers):
        response = client.put(
            f'/api/documents/{document.id}',
            json={'title': 'Hijacked'},
            headers=auth_headers(stranger),
        )
        assert response.status_code in (403, 404)
        db.session.refresh(document)
        assert document.title == 'Service Agreement'

    def test_owner_can_update_own_document(self, client, document, owner, auth_headers):
        """Also covers the str-vs-int identity bug that locked owners out."""
        response = client.put(
            f'/api/documents/{document.id}',
            json={'title': 'Updated Title'},
            headers=auth_headers(owner),
        )
        assert response.status_code == 200
        db.session.refresh(document)
        assert document.title == 'Updated Title'

    def test_status_cannot_be_set_directly(self, client, document, owner, auth_headers):
        response = client.put(
            f'/api/documents/{document.id}',
            json={'status': 'signed'},
            headers=auth_headers(owner),
        )
        assert response.status_code == 400
        db.session.refresh(document)
        assert document.status == 'sent'

    def test_stranger_cannot_cancel_document(self, client, document, stranger, auth_headers):
        response = client.post(
            f'/api/documents/{document.id}/cancel', headers=auth_headers(stranger)
        )
        assert response.status_code in (403, 404)
        db.session.refresh(document)
        assert document.status == 'sent'

    def test_client_supplied_file_path_is_rejected(self, client, owner, auth_headers):
        response = client.post(
            '/api/documents/',
            json={
                'title': 'Evil',
                'doc_type': 'other',
                'file_path': '/etc/passwd',
            },
            headers=auth_headers(owner),
        )
        assert response.status_code == 400

    def test_invalid_doc_type_is_rejected(self, client, owner, auth_headers):
        response = client.post(
            '/api/documents/',
            json={'title': 'Bad type', 'doc_type': 'malware'},
            headers=auth_headers(owner),
        )
        assert response.status_code == 400


class TestSignatureForgery:
    def test_stranger_cannot_sign_document(self, client, document, stranger, auth_headers):
        response = client.post(
            f'/api/documents/{document.id}/signatures',
            json={'signature_data': 'data:image/png;base64,AAAA'},
            headers=auth_headers(stranger),
        )
        assert response.status_code in (403, 404)
        db.session.refresh(document)
        assert document.status == 'sent'

    def test_signer_identity_comes_from_the_token(
        self, client, document, make_user, auth_headers
    ):
        """Signer name/email must not be attacker-controlled."""
        signer = make_user(role='employee', email='signer@example.com', name='Real Signer')
        document.reference_type = 'user'
        document.reference_id = signer.id
        db.session.commit()

        response = client.post(
            f'/api/documents/{document.id}/signatures',
            json={
                'signature_data': 'data:image/png;base64,AAAA',
                'signer_name': 'Somebody Else',
                'signer_email': 'spoofed@example.com',
            },
            headers=auth_headers(signer),
        )

        assert response.status_code == 201
        data = response.get_json()['data']
        assert data['signer_name'] == 'Real Signer'
        assert data['signer_email'] == 'signer@example.com'
        assert data['signer_id'] == signer.id

    def test_unauthenticated_cannot_sign(self, client, document):
        response = client.post(
            f'/api/documents/{document.id}/signatures',
            json={'signature_data': 'data:image/png;base64,AAAA'},
        )
        assert response.status_code == 401

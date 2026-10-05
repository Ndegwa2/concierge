"""Regression tests for the critical authentication findings.

Each test below fails against the pre-fix code:

* C2 - `PUT /auth/profile` rewrote the password from the request body with no
  current-password check (account takeover with a stolen access token).
* C3 - `POST /auth/admin/create` accepted any admin and wrote `role` verbatim
  (privilege escalation to super_admin / arbitrary roles).
"""
from app import db
from app.services.auth.models import User


class TestProfileUpdateCannotChangeCredentials:
    def test_password_change_without_current_password_is_rejected(
        self, client, make_user, auth_headers
    ):
        user = make_user(password='CorrectHorse1')
        original_hash = user.password_hash

        response = client.put(
            '/api/auth/profile',
            json={'password': 'AttackerPass9'},
            headers=auth_headers(user),
        )

        assert response.status_code == 401
        assert response.get_json()['error'] == 'CURRENT_PASSWORD_REQUIRED'

        db.session.refresh(user)
        assert user.password_hash == original_hash
        assert user.check_password('CorrectHorse1')
        assert not user.check_password('AttackerPass9')

    def test_email_change_without_current_password_is_rejected(
        self, client, make_user, auth_headers
    ):
        user = make_user(email='victim@example.com')

        response = client.put(
            '/api/auth/profile',
            json={'email': 'attacker@example.com'},
            headers=auth_headers(user),
        )

        assert response.status_code == 401
        db.session.refresh(user)
        assert user.email == 'victim@example.com'

    def test_wrong_current_password_is_rejected(self, client, make_user, auth_headers):
        user = make_user(password='CorrectHorse1')

        response = client.put(
            '/api/auth/profile',
            json={'password': 'NewPassword9', 'current_password': 'WrongGuess1'},
            headers=auth_headers(user),
        )

        assert response.status_code == 401
        db.session.refresh(user)
        assert user.check_password('CorrectHorse1')

    def test_password_change_with_current_password_succeeds(
        self, client, make_user, auth_headers
    ):
        user = make_user(password='CorrectHorse1')

        response = client.put(
            '/api/auth/profile',
            json={'password': 'NewPassword9', 'current_password': 'CorrectHorse1'},
            headers=auth_headers(user),
        )

        assert response.status_code == 200
        assert response.get_json()['data']['reauthenticate'] is True
        db.session.refresh(user)
        assert user.check_password('NewPassword9')

    def test_weak_password_is_rejected_even_with_current_password(
        self, client, make_user, auth_headers
    ):
        user = make_user(password='CorrectHorse1')

        response = client.put(
            '/api/auth/profile',
            json={'password': 'short', 'current_password': 'CorrectHorse1'},
            headers=auth_headers(user),
        )

        assert response.status_code == 400
        db.session.refresh(user)
        assert user.check_password('CorrectHorse1')

    def test_display_fields_still_update_without_password(
        self, client, make_user, auth_headers
    ):
        user = make_user(name='Old Name')

        response = client.put(
            '/api/auth/profile',
            json={'name': 'New Name'},
            headers=auth_headers(user),
        )

        assert response.status_code == 200
        db.session.refresh(user)
        assert user.name == 'New Name'

    def test_privileged_fields_are_rejected(self, client, make_user, auth_headers):
        """A customer must not be able to promote themselves via the profile API."""
        user = make_user(role='customer')

        response = client.put(
            '/api/auth/profile',
            json={'role': 'admin', 'is_admin': True},
            headers=auth_headers(user),
        )

        assert response.status_code == 400
        db.session.refresh(user)
        assert user.role == 'customer'
        assert user.is_admin is False


class TestAdminCreationPrivilegeEscalation:
    def test_plain_admin_cannot_create_accounts(self, client, make_user, auth_headers):
        admin = make_user(role='admin')

        response = client.post(
            '/api/auth/admin/create',
            json={
                'name': 'Escalated',
                'email': 'escalated@example.com',
                'password': 'StrongPass1',
                'role': 'super_admin',
            },
            headers=auth_headers(admin),
        )

        assert response.status_code == 403
        assert User.query.filter_by(email='escalated@example.com').first() is None

    def test_super_admin_cannot_mint_arbitrary_roles(self, client, make_user, auth_headers):
        super_admin = make_user(role='super_admin')

        response = client.post(
            '/api/auth/admin/create',
            json={
                'name': 'Sneaky',
                'email': 'sneaky@example.com',
                'password': 'StrongPass1',
                'role': 'root',
            },
            headers=auth_headers(super_admin),
        )

        assert response.status_code == 400
        assert User.query.filter_by(email='sneaky@example.com').first() is None

    def test_super_admin_can_create_admin(self, client, make_user, auth_headers):
        super_admin = make_user(role='super_admin')

        response = client.post(
            '/api/auth/admin/create',
            json={
                'name': 'Legit Admin',
                'email': 'legit@example.com',
                'password': 'StrongPass1',
                'role': 'admin',
            },
            headers=auth_headers(super_admin),
        )

        assert response.status_code == 201
        created = User.query.filter_by(email='legit@example.com').first()
        assert created is not None
        assert created.role == 'admin'

    def test_customer_cannot_create_admin(self, client, make_user, auth_headers):
        customer = make_user(role='customer')

        response = client.post(
            '/api/auth/admin/create',
            json={
                'name': 'Nope',
                'email': 'nope@example.com',
                'password': 'StrongPass1',
            },
            headers=auth_headers(customer),
        )

        assert response.status_code == 403
        assert User.query.filter_by(email='nope@example.com').first() is None

    def test_unauthenticated_cannot_create_admin(self, client):
        response = client.post(
            '/api/auth/admin/create',
            json={
                'name': 'Anon',
                'email': 'anon@example.com',
                'password': 'StrongPass1',
            },
        )

        assert response.status_code == 401


class TestPhoneSearchToken:
    def test_token_is_peppered_not_plain_sha256(self, app):
        """A plain digest of an MSISDN is reversible by enumeration."""
        import hashlib

        phone = '+254712345678'
        plain = hashlib.sha256(phone.encode()).hexdigest()

        assert User._compute_phone_search_token(phone) != plain
        assert User._legacy_phone_search_token(phone) == plain

    def test_token_is_stable_for_equivalent_formats(self, app):
        a = User._compute_phone_search_token('+254 712 345 678')
        b = User._compute_phone_search_token('+254712345678')
        assert a == b

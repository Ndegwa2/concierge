"""Flask CLI commands.

Keeping schema/data operations here (instead of inside ``create_app``) means:

* production processes never issue DDL behind Alembic's back;
* demo data is opt-in and can never be seeded into a real database;
* operators have a safe way to bootstrap the very first super-admin.
"""
import os
import click
from flask import Flask


def init_db_impl(seed_demo: bool = False):
    """Create tables and backfill legacy columns. Development/CI only."""
    from app import db
    from app.utils.db_initializer import ensure_legacy_columns, seed_demo_data

    environment = os.environ.get('FLASK_ENV', 'development')
    if environment != 'development' and os.environ.get('ALLOW_INIT_DB') != 'true':
        raise RuntimeError(
            "flask init-db is a development bootstrap helper. In production the "
            "schema is owned by Alembic - run `flask db upgrade`. Set "
            "ALLOW_INIT_DB=true only if you really intend to create tables "
            "outside of migrations."
        )

    db.create_all()
    ensure_legacy_columns()
    if seed_demo:
        return seed_demo_data()
    return {'services': 0, 'discount_codes': 0}


def backfill_phone_tokens() -> int:
    """Recompute ``phone_search_token`` with the peppered HMAC.

    Returns the number of rows updated. Phone lookup matches both the legacy and
    the current token (see ``admin.service.get_all_users_query``), so this is a
    hardening step rather than a breaking migration.
    """
    from app import db
    from app.services.auth.models import User

    updated = 0
    for user in User.query.all():
        if not user.phone:
            continue
        expected = User._compute_phone_search_token(user.phone)
        if expected and user.phone_search_token != expected:
            user.phone_search_token = expected
            updated += 1
    db.session.commit()
    return updated


def register_cli(app: Flask) -> None:
    @app.cli.command('init-db')
    @click.option('--seed-demo/--no-seed-demo', default=False,
                  help='Also insert sample services and discount codes.')
    def init_db_command(seed_demo):
        """Create missing tables and legacy columns (development bootstrap)."""
        created = init_db_impl(seed_demo=seed_demo)
        click.echo(f"Database initialized. Demo rows: {created}")

    @app.cli.command('seed-demo-data')
    def seed_demo_command():
        """Insert sample catalog data (never creates user accounts)."""
        from app.utils.db_initializer import seed_demo_data
        created = seed_demo_data()
        click.echo(f"Demo data seeded: {created}")

    @app.cli.command('backfill-phone-tokens')
    def backfill_phone_tokens_command():
        """Re-hash stored phone search tokens with the configured pepper."""
        updated = backfill_phone_tokens()
        click.echo(f"Updated {updated} phone search token(s).")

    @app.cli.command('create-admin')
    @click.option('--name', prompt='Full name')
    @click.option('--email', prompt='Email')
    @click.option('--role', default='super_admin',
                  type=click.Choice(['admin', 'super_admin']))
    @click.password_option('--password', confirmation_prompt=True)
    def create_admin_command(name, email, role, password):
        """Create an administrator account (bootstrap path for the first admin)."""
        from app import db
        from app.services.auth.models import User
        from app.utils.validation import validate_email, validate_password

        ok, message = validate_email(email)
        if not ok:
            raise click.ClickException(message)
        ok, message = validate_password(password)
        if not ok:
            raise click.ClickException(message)

        email = email.lower().strip()
        if User.query.filter_by(email=email).first():
            raise click.ClickException(f"A user with {email} already exists.")

        user = User()
        user.name = name.strip()
        user.email = email
        user.set_password(password)
        user.role = role
        user.is_admin = True
        user.is_active = True
        db.session.add(user)
        db.session.commit()
        click.echo(f"Created {role} {email} (id={user.id}).")

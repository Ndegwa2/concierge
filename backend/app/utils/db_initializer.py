"""Development database helpers.

These helpers used to run on every application start. They are now invoked
explicitly (``flask init-db`` / ``flask seed-demo-data``) so that schema creation
cannot race with migrations and demo data can never land in production.
"""
from app import db
from app.services.catalog.models import Service, DiscountCode
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def ensure_legacy_columns():
    """Idempotently add columns that the earliest revisions may be missing.

    Schema changes belong in Alembic migrations; this only exists so that
    ``flask init-db`` can bootstrap a database created before those migrations.
    """
    with db.engine.connect() as conn:
        conn.execute(db.text("""
            ALTER TABLE appointments
            ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS overdue_notified BOOLEAN DEFAULT FALSE
        """))
        conn.execute(db.text("""
            ALTER TABLE notifications
            ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50) DEFAULT 'info'
        """))
        conn.commit()


def seed_demo_data():
    """Insert sample catalog data for local development.

    Deliberately **does not** create user accounts: the previous implementation
    seeded three customers with the password ``password123``, which would have
    become a ready-made credential set had it ever run against an empty
    production database. Create accounts with ``flask create-admin`` or through
    the registration endpoint.
    """
    created = {'services': 0, 'discount_codes': 0}

    if Service.query.count() == 0:
        db.session.add_all([
            Service(name='Preventive Maintenance & Inspections',
                    description='Routine vehicle health checks and preventive maintenance coordination',
                    price=99.99, duration=120, category='maintenance'),
            Service(name='Repair Coordination',
                    description='Vehicle delivery to and collection from approved garages',
                    price=149.99, duration=180, category='repair'),
            Service(name='Car Wash & Detailing',
                    description='Premium detailing services including interior, exterior, and engine bay',
                    price=79.99, duration=90, category='detailing'),
            Service(name='Pick-Up & Drop-Off',
                    description='Door-to-door vehicle collection and return with GPS tracking',
                    price=49.99, duration=60, category='convenience'),
            Service(name='Convenience & Lifestyle Support',
                    description='Fuel refilling, tyre checks, battery checks, and roadside assistance',
                    price=39.99, duration=45, category='convenience'),
            Service(name='Corporate & Fleet Concierge',
                    description='Fleet maintenance scheduling and multi-vehicle service coordination',
                    price=299.99, duration=240, category='corporate'),
        ])
        created['services'] = 6

    if DiscountCode.query.count() == 0:
        db.session.add_all([
            DiscountCode(code='WELCOME10', discount_type='percentage', value=10.00,
                         minimum_spend=50.00, max_uses=100, used_count=0,
                         start_date=datetime(2024, 1, 1), end_date=datetime(2030, 12, 31),
                         is_active=True),
            DiscountCode(code='FIRSTORDER20', discount_type='percentage', value=20.00,
                         minimum_spend=100.00, max_uses=50, used_count=0,
                         start_date=datetime(2024, 1, 1), end_date=datetime(2030, 12, 31),
                         is_active=True),
        ])
        created['discount_codes'] = 2

    db.session.commit()
    logger.info('Demo data seeded: %s', created)
    return created

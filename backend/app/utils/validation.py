"""Shared input validation helpers.

Historically these validators lived inside ``app.services.auth.routes`` and were
duplicated (in slightly different forms) by other services. Every consumer now
imports from here so that a policy change only has to be made once.

Nothing in this module imports Flask or the app package, so it is safe to use
from services, tasks and CLI commands alike.
"""
import re

EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
PHONE_PATTERN = re.compile(r'^(\+254|254|0)[17]\d{8}$')

MIN_PASSWORD_LENGTH = 8


def normalize_phone(phone):
    """Strip the separators that users habitually type into phone fields."""
    if not phone:
        return None
    return str(phone).replace(' ', '').replace('-', '').replace('(', '').replace(')', '')


def validate_email(email):
    if not email or not isinstance(email, str):
        return False, "Email is required"
    if not EMAIL_PATTERN.match(email.strip()):
        return False, "Invalid email format"
    if len(email.strip()) > 120:
        return False, "Email is too long"
    return True, "Email is valid"


def validate_password(password):
    if not isinstance(password, str) or len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    if len(password) > 128:
        return False, "Password must be at most 128 characters long"
    return True, "Password is valid"


def validate_phone(phone):
    if not phone:
        return True, "Phone is optional"
    normalized = normalize_phone(phone)
    if not PHONE_PATTERN.match(normalized):
        return False, "Invalid Kenyan phone number format"
    return True, "Phone is valid"


def validate_name(name):
    if not name or not isinstance(name, str):
        return False, "Name is required"
    stripped = name.strip()
    if len(stripped) < 2:
        return False, "Name is too short"
    if len(stripped) > 100:
        return False, "Name is too long"
    return True, "Name is valid"


def validate_role(role, allowed_roles):
    """Return ``(normalized_role, None)`` or ``(None, error_message)``."""
    if not role or not isinstance(role, str):
        return None, "Role is required"
    normalized = role.lower().strip()
    if normalized not in allowed_roles:
        return None, f"Invalid role. Allowed roles: {', '.join(sorted(allowed_roles))}"
    return normalized, None

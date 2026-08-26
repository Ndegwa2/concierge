"""
Utilities for appointment notifications.

This module re-exports from the notifications domain for backward compatibility.
New code should import directly from:
    from app.services.notifications.scheduler import start_scheduler
"""

from app.services.notifications.scheduler import start_scheduler, check_appointments

__all__ = ['start_scheduler', 'check_appointments']

from flask import Blueprint, request, jsonify
import logging
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import db, limiter
from app.utils.decorators import get_current_user
from app.services.payments.service import (
    initiate_mpesa_payment,
    check_payment_status,
    get_payment_by_id,
    get_payments_for_appointment,
)

logger = logging.getLogger(__name__)
payments_bp = Blueprint('payments', __name__)


def _current_user():
    return get_current_user()


@payments_bp.route('/mpesa/stk-push', methods=['POST'])
@jwt_required()
@limiter.limit("5 per minute")
def mpesa_stk_push():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Request body required'}), 400

        appointment_id = data.get('appointment_id')
        phone_number = data.get('phone_number')

        if not appointment_id:
            return jsonify({'success': False, 'message': 'appointment_id is required'}), 400
        if not phone_number:
            return jsonify({'success': False, 'message': 'phone_number is required'}), 400

        result = initiate_mpesa_payment(
            appointment_id=int(appointment_id),
            phone_number=phone_number,
            current_user=_current_user(),
        )

        return jsonify({
            'success': True,
            'message': result['message'],
            'data': {'payment': result['payment']},
        }), 200

    except PermissionError as e:
        return jsonify({'success': False, 'message': str(e)}), 403
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': 'Failed to initiate payment. Please try again.'}), 500


@payments_bp.route('/<int:payment_id>/status', methods=['GET'])
@jwt_required()
def payment_status(payment_id):
    try:
        payment = check_payment_status(payment_id, _current_user())
        return jsonify({
            'success': True,
            'data': {'payment': payment.to_dict()},
        }), 200
    except PermissionError as e:
        return jsonify({'success': False, 'message': str(e)}), 403
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': 'Failed to check payment status'}), 500


@payments_bp.route('/<int:payment_id>', methods=['GET'])
@jwt_required()
def get_payment(payment_id):
    try:
        payment = get_payment_by_id(payment_id, _current_user())
        return jsonify({
            'success': True,
            'data': {'payment': payment.to_dict()},
        }), 200
    except PermissionError as e:
        return jsonify({'success': False, 'message': str(e)}), 403
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 404


@payments_bp.route('/appointment/<int:appointment_id>', methods=['GET'])
@jwt_required()
def appointment_payments(appointment_id):
    try:
        payments = get_payments_for_appointment(appointment_id, _current_user())
        return jsonify({
            'success': True,
            'data': {'payments': [p.to_dict() for p in payments]},
        }), 200
    except PermissionError as e:
        return jsonify({'success': False, 'message': str(e)}), 403
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 404


@payments_bp.route('/mpesa/callback', methods=['POST'])
def mpesa_callback():
    """Persist M-Pesa Daraja callback payload and ack immediately.

    Returns 200 OK as soon as the payload is durably stored in the
    webhook_events table. Actual payment state changes happen in the
    background via the process_webhook_event Celery task. This prevents
    Safaricom from timing out and retrying, and makes processing
    idempotent: the unique (source, external_event_id) constraint
    deduplicates retried deliveries.
    """
    from app import db
    from app.services.payments.models import WebhookEvent
    from app.tasks.payment_tasks import process_webhook_event
    from sqlalchemy.exc import IntegrityError

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'ResultCode': 1, 'ResultDesc': 'Invalid callback data'}), 400

    stk_callback = (data.get('Body') or {}).get('StkCallback') or {}
    checkout_request_id = stk_callback.get('CheckoutRequestId') or ''
    merchant_request_id = stk_callback.get('MerchantRequestId') or ''
    external_event_id = checkout_request_id or merchant_request_id or 'unknown'

    event = WebhookEvent(
        source='mpesa',
        external_event_id=external_event_id,
        payload=data,
        status='unprocessed',
    )

    try:
        db.session.add(event)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        logger.info('Duplicate M-Pesa webhook ignored: %s', external_event_id)
        return jsonify({'ResultCode': 0, 'ResultDesc': 'Already accepted'}), 200
    except Exception as exc:
        logger.exception('Failed to persist M-Pesa webhook: %s', exc)
        db.session.rollback()
        return jsonify({'ResultCode': 1, 'ResultDesc': 'Processing error'}), 500

    try:
        process_webhook_event.delay(event.id)
    except Exception as exc:
        logger.exception('Failed to enqueue webhook processing for event %s: %s', event.id, exc)

    return jsonify({'ResultCode': 0, 'ResultDesc': 'Accepted'}), 200

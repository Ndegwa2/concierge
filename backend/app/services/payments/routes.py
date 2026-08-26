from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import db, limiter
from app.utils.decorators import get_current_user
from app.services.payments.service import (
    initiate_mpesa_payment,
    check_payment_status,
    handle_mpesa_callback,
    get_payment_by_id,
    get_payments_for_appointment,
)

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
    try:
        data = request.get_json()
        if not data:
            return jsonify({'ResultCode': 1, 'ResultDesc': 'Invalid callback data'}), 400

        result = handle_mpesa_callback(data)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'ResultCode': 1, 'ResultDesc': 'Processing error'}), 500

import os
import logging
from datetime import datetime, timezone
from app import db
from app.services.auth.models import User
from app.services.appointments.models import Appointment
from app.services.fleets.models import Invoice
from app.services.payments.models import Payment
from app.services.payments.mpesa import get_mpesa_client, MpesaError
from app.utils.email import send_email

logger = logging.getLogger(__name__)


def _generate_payment_reference():
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    count = Payment.query.filter(
        Payment.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
    ).count()
    return f'PAY-{timestamp}-{count + 1:04d}'


def initiate_mpesa_payment(appointment_id: int, phone_number: str, current_user: dict):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        raise ValueError('Appointment not found')

    if current_user['role'] == 'customer' and appointment.user_id != current_user['id']:
        raise PermissionError('Unauthorized access to appointment')

    if appointment.status != 'completed':
        raise ValueError('Appointment must be completed before payment')

    invoice = Invoice.query.filter_by(appointment_id=appointment.id).first()
    if not invoice:
        raise ValueError('No invoice found for this appointment. Please request an invoice first.')

    if invoice.status == 'paid':
        raise ValueError('This invoice has already been paid')

    amount = float(invoice.total_amount or appointment.total_amount or 0)
    if amount <= 0:
        raise ValueError('Invalid payment amount')

    existing_payment = Payment.query.filter_by(
        invoice_id=invoice.id,
        status='processing'
    ).first()
    if existing_payment:
        return {
            'payment': existing_payment.to_dict(),
            'message': 'Payment already in progress. Please check your phone for the STK push.',
        }

    payment = Payment(
        payment_reference=_generate_payment_reference(),
        invoice_id=invoice.id,
        appointment_id=appointment.id,
        user_id=appointment.user_id,
        amount=amount,
        currency=invoice.currency or 'KES',
        method='mpesa',
        status='processing',
        mpesa_phone_number=phone_number,
    )
    db.session.add(payment)
    db.session.flush()

    try:
        mpesa = get_mpesa_client()
        response = mpesa.stk_push(
            phone_number=phone_number,
            amount=amount,
            account_reference=invoice.invoice_number,
            transaction_desc=f'Payment for {invoice.invoice_number}',
        )

        payment.merchant_request_id = response.get('MerchantRequestId')
        payment.checkout_request_id = response.get('CheckoutRequestId')
        db.session.commit()

        return {
            'payment': payment.to_dict(),
            'message': response.get('CustomerMessage', 'Check your phone and enter M-Pesa PIN to complete payment.'),
        }
    except MpesaError as e:
        payment.status = 'failed'
        payment.failure_reason = str(e)
        db.session.commit()
        raise


def check_payment_status(payment_id: int, current_user: dict):
    payment = Payment.query.get(payment_id)
    if not payment:
        raise ValueError('Payment not found')

    if current_user['role'] == 'customer' and payment.user_id != current_user['id']:
        raise PermissionError('Unauthorized access to payment')

    if payment.status != 'processing' or not payment.checkout_request_id:
        return payment.to_dict()

    try:
        mpesa = get_mpesa_client()
        response = mpesa.query_stk_status(payment.checkout_request_id)

        result_code = response.get('ResultCode')
        if result_code == '0':
            payment.status = 'completed'
            payment.paid_at = datetime.now(timezone.utc)
            _on_payment_success(payment)
        elif result_code is not None:
            payment.status = 'failed'
            payment.failure_reason = response.get('ResultDesc', 'Payment failed')

        db.session.commit()
    except MpesaError as e:
        logger.error('Failed to query payment status: %s', e)

    return payment.to_dict()


def handle_mpesa_callback(callback_data: dict):
    stk_callback = callback_data.get('Body', {}).get('StkCallback', {})
    merchant_request_id = stk_callback.get('MerchantRequestId')
    checkout_request_id = stk_callback.get('CheckoutRequestId')
    result_code = stk_callback.get('ResultCode')

    payment = Payment.query.filter_by(
        checkout_request_id=checkout_request_id,
        merchant_request_id=merchant_request_id,
    ).first()

    if not payment:
        logger.warning('M-Pesa callback for unknown payment: %s', checkout_request_id)
        return {'ResultCode': 0, 'ResultDesc': 'Accepted'}

    if payment.status == 'completed':
        return {'ResultCode': 0, 'ResultDesc': 'Already processed'}

    if result_code == '0':
        callback_metadata = stk_callback.get('CallbackMetadata', {}).get('Item', {})
        metadata = {item['Name']: item.get('Value') for item in callback_metadata if 'Name' in item}

        payment.status = 'completed'
        payment.mpesa_receipt_number = metadata.get('MpesaReceiptNumber')
        payment.mpesa_phone_number = str(metadata.get('PhoneNumber', ''))
        payment.paid_at = datetime.now(timezone.utc)

        transaction_date_str = metadata.get('TransactionDate')
        if transaction_date_str:
            try:
                payment.mpesa_transaction_date = datetime.strptime(
                    str(transaction_date_str), '%Y%m%d%H%M%S'
                ).replace(tzinfo=timezone.utc)
            except ValueError:
                pass

        _on_payment_success(payment)
    else:
        payment.status = 'failed'
        payment.failure_reason = stk_callback.get('ResultDesc', 'Payment cancelled or failed')

    db.session.commit()
    return {'ResultCode': 0, 'ResultDesc': 'Accepted'}


def _on_payment_success(payment: Payment):
    invoice = payment.invoice
    if invoice:
        invoice.status = 'paid'

    appointment = payment.appointment
    if appointment:
        appointment.payment_status = 'paid'

    db.session.flush()
    _send_payment_receipt(payment)


def _send_payment_receipt(payment: Payment):
    user = User.query.get(payment.user_id)
    if not user or not user.email:
        return

    invoice = payment.invoice
    subject = f'Payment Receipt - {payment.payment_reference}'
    body = (
        f"Dear {user.name},\n\n"
        f"Thank you for your payment.\n\n"
        f"Payment Reference: {payment.payment_reference}\n"
        f"Invoice Number: {invoice.invoice_number if invoice else 'N/A'}\n"
        f"Amount Paid: {payment.currency} {float(payment.amount):,.2f}\n"
        f"Payment Method: M-Pesa\n"
    )

    if payment.mpesa_receipt_number:
        body += f"M-Pesa Receipt: {payment.mpesa_receipt_number}\n"

    body += (
        f"Date: {payment.paid_at.strftime('%Y-%m-%d %H:%M') if payment.paid_at else 'N/A'}\n\n"
        f"Thank you for choosing AutoConcierge.\n"
    )

    try:
        send_email(to=user.email, subject=subject, body=body)
    except Exception as e:
        logger.error('Failed to send payment receipt: %s', e)


def get_payment_by_id(payment_id: int, current_user: dict):
    payment = Payment.query.get(payment_id)
    if not payment:
        raise ValueError('Payment not found')

    if current_user['role'] == 'customer' and payment.user_id != current_user['id']:
        raise PermissionError('Unauthorized access to payment')

    return payment


def get_payments_for_appointment(appointment_id: int, current_user: dict):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        raise ValueError('Appointment not found')

    if current_user['role'] == 'customer' and appointment.user_id != current_user['id']:
        raise PermissionError('Unauthorized access to appointment')

    return Payment.query.filter_by(appointment_id=appointment_id).order_by(Payment.created_at.desc()).all()

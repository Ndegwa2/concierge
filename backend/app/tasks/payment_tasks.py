"""
Payment Tasks for AutoConcierge
================================
Offloads M-Pesa Daraja API calls from Gunicorn workers.
"""
import logging
from app.celery import celery
from app import db

logger = logging.getLogger(__name__)


@celery.task(name='app.tasks.payment_tasks.process_stk_push', bind=True, max_retries=2, default_retry_delay=30)
def process_stk_push(self, payment_id, phone_number, amount, account_reference, transaction_desc):
    """Process M-Pesa STK push asynchronously."""
    from app.services.payments.models import Payment
    from app.services.payments.mpesa import get_mpesa_client, MpesaError

    payment = Payment.query.get(payment_id)
    if not payment:
        logger.warning('Payment %s not found', payment_id)
        return {'error': 'Payment not found'}

    try:
        mpesa = get_mpesa_client()
        response = mpesa.stk_push(
            phone_number=phone_number,
            amount=amount,
            account_reference=account_reference,
            transaction_desc=transaction_desc,
        )

        payment.merchant_request_id = response.get('MerchantRequestId')
        payment.checkout_request_id = response.get('CheckoutRequestId')
        db.session.commit()

        return {
            'success': True,
            'customer_message': response.get('CustomerMessage', 'Check your phone and enter M-Pesa PIN.'),
        }

    except MpesaError as exc:
        payment.status = 'failed'
        payment.failure_reason = str(exc)
        db.session.commit()
        logger.error('STK push failed for payment %s: %s', payment_id, exc)
        raise self.retry(exc=exc)


@celery.task(name='app.tasks.payment_tasks.query_payment_status', bind=True, max_retries=2, default_retry_delay=30)
def query_payment_status(self, payment_id):
    """Query M-Pesa STK payment status asynchronously."""
    from app.services.payments.models import Payment
    from app.services.payments.mpesa import get_mpesa_client, MpesaError
    from app.tasks.email_tasks import send_payment_receipt
    from datetime import datetime, timezone

    payment = Payment.query.get(payment_id)
    if not payment:
        return {'error': 'Payment not found'}

    if payment.status != 'processing' or not payment.checkout_request_id:
        return {'status': payment.status}

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
        return {'status': payment.status}

    except MpesaError as exc:
        logger.error('Payment status query failed: %s', exc)
        raise self.retry(exc=exc)


def _on_payment_success(payment):
    """Handle successful payment - update records and send receipt."""
    from app.services.fleets.models import Invoice

    invoice = payment.invoice
    if invoice:
        invoice.status = 'paid'

    appointment = payment.appointment
    if appointment:
        appointment.payment_status = 'paid'

    db.session.flush()

    send_payment_receipt.delay(payment.id)


@celery.task(name='app.tasks.payment_tasks.process_webhook_event', bind=True, max_retries=5, default_retry_delay=15, acks_late=True)
def process_webhook_event(self, webhook_event_id):
    """Process a persisted webhook event asynchronously.

    Reads the raw payload from the webhook_events table, applies the
    business logic, and marks the event as processed. Retries on
    transient failures with exponential backoff.
    """
    from datetime import datetime, timezone
    from app.services.payments.models import WebhookEvent

    event = WebhookEvent.query.get(webhook_event_id)
    if not event:
        logger.warning('Webhook event %s not found', webhook_event_id)
        return {'status': 'missing'}

    if event.status == 'processed':
        return {'status': 'already_processed'}

    event.status = 'processing'
    event.attempts = (event.attempts or 0) + 1
    db.session.commit()

    try:
        if event.source == 'mpesa':
            from app.services.payments.service import handle_mpesa_callback
            handle_mpesa_callback(event.payload)
        else:
            logger.warning('No handler for webhook source %s', event.source)
            event.status = 'failed'
            event.last_error = f'No handler for source {event.source}'
            db.session.commit()
            return {'status': 'unhandled_source'}

        event.status = 'processed'
        event.processed_at = datetime.now(timezone.utc)
        event.last_error = None
        db.session.commit()
        return {'status': 'processed'}

    except Exception as exc:
        logger.exception('Webhook event %s processing failed: %s', webhook_event_id, exc)
        event.status = 'unprocessed' if (event.attempts or 0) < (self.max_retries or 5) else 'failed'
        event.last_error = str(exc)[:1000]
        db.session.commit()
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            event.status = 'failed'
            db.session.commit()
            return {'status': 'failed', 'error': str(exc)[:1000]}

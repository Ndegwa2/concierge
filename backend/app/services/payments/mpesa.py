import os
import base64
import hashlib
import hmac
import logging
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError
import json

logger = logging.getLogger(__name__)


class MpesaError(Exception):
    pass


class MpesaClient:
    SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
    PRODUCTION_URL = 'https://api.safaricom.co.ke'

    def __init__(self):
        self.consumer_key = os.environ.get('MPESA_CONSUMER_KEY')
        self.consumer_secret = os.environ.get('MPESA_CONSUMER_SECRET')
        self.passkey = os.environ.get('MPESA_PASSKEY')
        self.shortcode = os.environ.get('MPESA_SHORTCODE')
        self.callback_url = os.environ.get('MPESA_CALLBACK_URL', '')
        self.environment = os.environ.get('MPESA_ENVIRONMENT', 'sandbox')

        if not all([self.consumer_key, self.consumer_secret, self.passkey, self.shortcode]):
            logger.warning('M-Pesa credentials not fully configured')

    def _base_url(self):
        return self.PRODUCTION_URL if self.environment == 'production' else self.SANDBOX_URL

    def _access_token(self):
        if not self.consumer_key or not self.consumer_secret:
            raise MpesaError('M-Pesa consumer credentials not configured')

        credentials = base64.b64encode(
            f'{self.consumer_key}:{self.consumer_secret}'.encode()
        ).decode()

        req = Request(
            f'{self._base_url()}/oauth/v1/generate?grant_type=client_credentials',
            headers={'Authorization': f'Basic {credentials}'},
        )

        try:
            with urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode())
                return data['access_token']
        except (URLError, KeyError, json.JSONDecodeError) as e:
            logger.error('Failed to get M-Pesa access token: %s', e)
            raise MpesaError(f'Failed to authenticate with M-Pesa: {e}')

    def stk_push(self, phone_number: str, amount: float, account_reference: str, transaction_desc: str):
        if not self.passkey or not self.shortcode:
            raise MpesaError('M-Pesa passkey/shortcode not configured')

        token = self._access_token()
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(
            f'{self.shortcode}{self.passkey}{timestamp}'.encode()
        ).decode()

        cleaned_phone = self._clean_phone_number(phone_number)

        payload = {
            'BusinessShortCode': self.shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'TransactionType': 'CustomerPayBillOnline',
            'Amount': int(amount),
            'PartyA': cleaned_phone,
            'PartyB': self.shortcode,
            'PhoneNumber': cleaned_phone,
            'CallBackURL': self.callback_url,
            'AccountReference': account_reference,
            'TransactionDesc': transaction_desc,
        }

        req = Request(
            f'{self._base_url()}/mpesa/stkpush/v1/processprocess',
            data=json.dumps(payload).encode(),
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
        )

        try:
            with urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode())
                logger.info('M-Pesa STK Push initiated: %s', data.get('CheckoutRequestId'))
                return data
        except URLError as e:
            logger.error('M-Pesa STK Push failed: %s', e)
            raise MpesaError(f'STK Push request failed: {e}')
        except json.JSONDecodeError as e:
            logger.error('Invalid M-Pesa STK Push response: %s', e)
            raise MpesaError(f'Invalid response from M-Pesa: {e}')

    def query_stk_status(self, checkout_request_id: str):
        token = self._access_token()
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(
            f'{self.shortcode}{self.passkey}{timestamp}'.encode()
        ).decode()

        payload = {
            'BusinessShortCode': self.shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'CheckoutRequestId': checkout_request_id,
        }

        req = Request(
            f'{self._base_url()}/mpesa/stkpushquery/v1/query',
            data=json.dumps(payload).encode(),
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
        )

        try:
            with urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode())
        except (URLError, json.JSONDecodeError) as e:
            logger.error('M-Pesa STK query failed: %s', e)
            raise MpesaError(f'STK query failed: {e}')

    @staticmethod
    def _clean_phone_number(phone: str) -> str:
        cleaned = phone.replace(' ', '').replace('-', '').replace('+', '')
        if cleaned.startswith('0'):
            cleaned = '254' + cleaned[1:]
        elif cleaned.startswith('254'):
            pass
        elif cleaned.startswith('7') or cleaned.startswith('1'):
            cleaned = '254' + cleaned
        return cleaned


def verify_mpesa_callback(raw_body: bytes, callback_data: dict, signature_header: str = None) -> bool:
    """Verify that an M-Pesa webhook callback is authentic.

    Security strategy (defense in depth):

    1. If MPESA_WEBHOOK_VALIDATION_KEY is set, verify the HMAC-SHA256
       signature from the x-mpesa-signature header against the raw
       request body.
    2. If no validation key is configured (development), fall back to
       CheckoutRequestId validation — verify that a Payment with the
       given CheckoutRequestId exists in a pending/processing state.
       This prevents forged callbacks from completing payments that
       were never initiated.

    Returns True if the callback passes verification, False otherwise.
    """
    validation_key = os.environ.get('MPESA_WEBHOOK_VALIDATION_KEY')

    if validation_key:
        if not signature_header:
            logger.warning('M-Pesa callback rejected: missing signature header')
            return False

        expected_signature = hmac.new(
            key=validation_key.encode('utf-8'),
            msg=raw_body,
            digestmod=hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_signature, signature_header):
            logger.warning('M-Pesa callback rejected: invalid signature')
            return False

        logger.info('M-Pesa callback signature verified')
        return True

    # Fallback: validate CheckoutRequestId against known pending payments
    stk_callback = (callback_data.get('Body') or {}).get('StkCallback', {})
    checkout_request_id = stk_callback.get('CheckoutRequestId')

    if not checkout_request_id:
        logger.warning('M-Pesa callback rejected: missing CheckoutRequestId')
        return False

    try:
        from app.services.payments.models import Payment
        payment = Payment.query.filter(
            Payment.checkout_request_id == checkout_request_id,
            Payment.status.in_(['pending', 'processing']),
        ).first()

        if not payment:
            logger.warning('M-Pesa callback rejected: unknown or stale CheckoutRequestId %s', checkout_request_id)
            return False
    except Exception:
        logger.exception('M-Pesa callback CheckoutRequestId validation failed')
        return False

    logger.info('M-Pesa callback CheckoutRequestId validated: %s', checkout_request_id)
    return True


def get_mpesa_client():
    return MpesaClient()

from sqlalchemy.types import TypeDecorator, String as SQLString, Date as SQLDate
import os
import base64
from cryptography.fernet import Fernet


class EncryptedString(TypeDecorator):
    impl = SQLString
    cache_ok = True

    def __init__(self, length=255, **kwargs):
        super().__init__(length=length, **kwargs)
        key = os.environ.get('ENCRYPTION_KEY')
        if not key:
            raise RuntimeError(
                "ENCRYPTION_KEY environment variable must be set. "
                "Generate with: python -c 'import base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())'"
            )
        self._fernet = Fernet(key.encode() if isinstance(key, str) else key)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return self._fernet.encrypt(value.encode()).decode()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            return self._fernet.decrypt(value.encode()).decode()
        except Exception:
            return value


class EncryptedDate(TypeDecorator):
    impl = SQLDate
    cache_ok = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        key = os.environ.get('ENCRYPTION_KEY')
        if not key:
            raise RuntimeError(
                "ENCRYPTION_KEY environment variable must be set. "
                "Generate with: python -c 'import base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())'"
            )
        self._fernet = Fernet(key.encode() if isinstance(key, str) else key)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return self._fernet.encrypt(value.isoformat().encode()).decode()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        from datetime import datetime
        return datetime.strptime(self._fernet.decrypt(value.encode()).decode(), '%Y-%m-%d').date()

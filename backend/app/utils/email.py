import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email.mime.application import MIMEApplication
from email import encoders
from pathlib import Path
from flask import current_app

logger = logging.getLogger(__name__)


def get_mail_config():
    return {
        'server': current_app.config.get('MAIL_SERVER', 'smtp.gmail.com'),
        'port': int(current_app.config.get('MAIL_PORT', 587)),
        'use_tls': current_app.config.get('MAIL_USE_TLS', True),
        'username': current_app.config.get('MAIL_USERNAME'),
        'password': current_app.config.get('MAIL_PASSWORD'),
        'default_sender': current_app.config.get('MAIL_DEFAULT_SENDER') or current_app.config.get('MAIL_USERNAME'),
    }


def send_email_with_attachment(to, subject, body, attachment_path, attachment_filename):
    config = get_mail_config()

    if not config['username'] or not config['password']:
        raise RuntimeError('Email credentials are not configured')

    msg = MIMEMultipart()
    msg['From'] = config['default_sender']
    msg['To'] = to
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    attachment_full_path = Path(attachment_path)
    if not attachment_full_path.exists():
        raise FileNotFoundError(f'Attachment not found: {attachment_path}')

    with open(attachment_full_path, 'rb') as file:
        part = MIMEApplication(file.read(), Name=attachment_filename)
    part['Content-Disposition'] = f'attachment; filename="{attachment_filename}"'
    msg.attach(part)

    try:
        with smtplib.SMTP(config['server'], config['port']) as server:
            if config['use_tls']:
                server.starttls()
            server.login(config['username'], config['password'])
            server.sendmail(config['default_sender'], [to], msg.as_string())
    except smtplib.SMTPException as exc:
        logger.error('Failed to send email to %s: %s', to, exc)
        raise

    logger.info('Email sent to %s with attachment %s', to, attachment_filename)

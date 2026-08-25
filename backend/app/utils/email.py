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


def send_email(to, subject, body):
    config = get_mail_config()

    if not config['username'] or not config['password']:
        raise RuntimeError('Email credentials are not configured')

    msg = MIMEMultipart()
    msg['From'] = config['default_sender']
    msg['To'] = to
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP(config['server'], config['port']) as server:
            if config['use_tls']:
                server.starttls()
            server.login(config['username'], config['password'])
            server.sendmail(config['default_sender'], [to], msg.as_string())
    except smtplib.SMTPException as exc:
        logger.error('Failed to send email to %s: %s', to, exc)
        raise

    logger.info('Email sent to %s', to)


def send_fleet_invoice_email(to, contact_name, invoice_number, total_amount, currency, due_date, attachment_path, attachment_filename):
    subject = f'Fleet Invoice {invoice_number} - AutoConcierge'
    due = due_date.strftime('%Y-%m-%d') if hasattr(due_date, 'strftime') else str(due_date)
    body = (
        f"Dear {contact_name or 'Accounts Payable'},\n\n"
        f"Please find your fleet invoice attached.\n\n"
        f"Invoice Number: {invoice_number}\n"
        f"Total Amount: {currency} {float(total_amount):,.2f}\n"
        f"Due Date: {due}\n\n"
        f"Thank you for choosing AutoConcierge.\n"
    )
    send_email_with_attachment(
        to=to,
        subject=subject,
        body=body,
        attachment_path=attachment_path,
        attachment_filename=attachment_filename,
    )

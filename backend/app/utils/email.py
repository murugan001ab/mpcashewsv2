"""Async email sending utility using aiosmtplib."""

import ssl
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an HTML email. Returns True on success, False on failure."""
    message = MIMEMultipart("alternative")
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = to_email
    message["Subject"] = subject
    message.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST.strip(),
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME.strip(),
            password=settings.SMTP_PASSWORD.strip(),
            start_tls=True,
        )
        logger.info("Email sent to %s | subject: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


async def send_verification_email(to_email: str, token: str) -> bool:
    """Send the email-verification link to a newly registered user."""
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    subject = f"Verify your {settings.SMTP_FROM_NAME} account"
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px;">
        <h2 style="color: #2d6a4f;">Welcome to {settings.SMTP_FROM_NAME}!</h2>
        <p>Thanks for signing up. Please verify your email address to activate your account.</p>
        <p>
          <a href="{verify_url}"
             style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#fff;
                    border-radius:6px;text-decoration:none;font-weight:bold;">
            Verify Email
          </a>
        </p>
        <p style="color:#777;font-size:13px;">
          This link expires in {settings.EMAIL_VERIFY_EXPIRE_HOURS} hours.<br>
          If you did not create an account, you can safely ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#aaa;font-size:12px;">{settings.SMTP_FROM_NAME} &mdash; Premium Cashews</p>
      </body>
    </html>
    """
    return await send_email(to_email, subject, html_body)

"""Admin CRUD for editable templates, plus helpers used by the notification
services (whatsapp.py, email.py) to resolve a template from the DB with a
safe fallback to the .env-configured defaults if nothing's been saved yet.
"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.template import EmailTemplate, WhatsAppTemplate
from app.repositories.template import EmailTemplateRepository, WhatsAppTemplateRepository
from app.schemas.template import (
    EmailTemplateUpsert,
    EmailTemplateUpdate,
    WhatsAppTemplateUpdate,
)

logger = logging.getLogger(__name__)

# Fixed set of keys the codebase actually fires — see app/services/whatsapp.py
# and app/utils/email.py. Admins can edit these, but new *arbitrary* keys
# for WhatsApp aren't meaningful since nothing in the code would ever send
# them (Meta template events are wired by key, not freely invented).
DEFAULT_WHATSAPP_TEMPLATES = [
    {
        "key": "order_confirmed",
        "name": "Order Confirmed",
        "template_name": settings.WA_TEMPLATE_ORDER_CONFIRMED,
        "language_code": settings.WA_TEMPLATE_LANGUAGE,
        "description": "Params: customer_name, order_number, total_amount",
    },
    {
        "key": "order_shipped",
        "name": "Order Shipped",
        "template_name": settings.WA_TEMPLATE_ORDER_SHIPPED,
        "language_code": settings.WA_TEMPLATE_LANGUAGE,
        "description": "Params: customer_name, order_number, tracking_id",
    },
    {
        "key": "order_cancelled",
        "name": "Order Cancelled",
        "template_name": settings.WA_TEMPLATE_ORDER_CANCELLED,
        "language_code": settings.WA_TEMPLATE_LANGUAGE,
        "description": "Params: customer_name, order_number",
    },
    {
        "key": "order_delivered",
        "name": "Order Delivered",
        "template_name": settings.WA_TEMPLATE_ORDER_DELIVERED,
        "language_code": settings.WA_TEMPLATE_LANGUAGE,
        "description": "Params: customer_name, order_number",
    },
    {
        "key": "order_out_for_delivery",
        "name": "Order Out For Delivery",
        "template_name": settings.WA_TEMPLATE_ORDER_OUT_DELIVERY,
        "language_code": settings.WA_TEMPLATE_LANGUAGE,
        "description": "Params: customer_name, order_number",
    },
    {
        "key": "otp",
        "name": "OTP Verification",
        "template_name": settings.WA_TEMPLATE_OTP,
        "language_code": settings.WA_TEMPLATE_LANGUAGE,
        "description": "Params: otp_code",
    },
]

DEFAULT_EMAIL_TEMPLATES = [
    {
        "key": "verification_email",
        "name": "Email Verification",
        "subject": "Verify your {{app_name}} account",
        "description": "Sent on registration / resend-verification. "
                        "Placeholders: {{app_name}}, {{verify_url}}, {{expire_hours}}",
        "html_body": """
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px;">
        <h2 style="color: #2d6a4f;">Welcome to {{app_name}}!</h2>
        <p>Thanks for signing up. Please verify your email address to activate your account.</p>
        <p>
          <a href="{{verify_url}}"
             style="display:inline-block;padding:12px 24px;background:#2d6a4f;color:#fff;
                    border-radius:6px;text-decoration:none;font-weight:bold;">
            Verify Email
          </a>
        </p>
        <p style="color:#777;font-size:13px;">
          This link expires in {{expire_hours}} hours.<br>
          If you did not create an account, you can safely ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#aaa;font-size:12px;">{{app_name}} &mdash; Premium Cashews</p>
      </body>
    </html>
    """,
    },
]


def render_template(text: str, **kwargs) -> str:
    """Very small {{placeholder}} substitution — no Jinja dependency needed
    for the handful of variables these templates use."""
    for k, v in kwargs.items():
        text = text.replace("{{" + k + "}}", str(v))
    return text


async def seed_default_templates(db: AsyncSession) -> None:
    """Idempotently insert default templates on startup so the admin panel
    is never empty and notification code always has something to send."""
    email_repo = EmailTemplateRepository(db)
    wa_repo = WhatsAppTemplateRepository(db)

    for defaults in DEFAULT_EMAIL_TEMPLATES:
        if not await email_repo.get_by_key(defaults["key"]):
            db.add(EmailTemplate(**defaults))

    for defaults in DEFAULT_WHATSAPP_TEMPLATES:
        if not await wa_repo.get_by_key(defaults["key"]):
            db.add(WhatsAppTemplate(**defaults))

    await db.flush()
    await db.commit()


async def get_whatsapp_template_config(db: AsyncSession, key: str) -> tuple[str, str]:
    """Returns (template_name, language_code) for a WhatsApp event key,
    preferring the admin-edited DB row and falling back to .env defaults
    if the row is missing or inactive."""
    repo = WhatsAppTemplateRepository(db)
    tpl = await repo.get_by_key(key)
    if tpl and tpl.is_active:
        return tpl.template_name, tpl.language_code

    fallback = next((d for d in DEFAULT_WHATSAPP_TEMPLATES if d["key"] == key), None)
    if fallback:
        return fallback["template_name"], fallback["language_code"]
    raise ValueError(f"Unknown WhatsApp template key: {key}")


async def get_email_template(db: AsyncSession, key: str) -> Optional[EmailTemplate]:
    """Returns the admin-edited EmailTemplate row, or None if not found /
    inactive (caller should fall back to a hardcoded default in that case)."""
    repo = EmailTemplateRepository(db)
    tpl = await repo.get_by_key(key)
    if tpl and tpl.is_active:
        return tpl
    return None


class TemplateService:
    """Admin-facing CRUD for both template types."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_repo = EmailTemplateRepository(db)
        self.wa_repo = WhatsAppTemplateRepository(db)

    # -- Email --------------------------------------------------------

    async def list_email_templates(self) -> list[EmailTemplate]:
        return await self.email_repo.list_all()

    async def get_email_template(self, key: str) -> EmailTemplate:
        tpl = await self.email_repo.get_by_key(key)
        if not tpl:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email template not found")
        return tpl

    async def upsert_email_template(self, key: str, data: EmailTemplateUpsert) -> EmailTemplate:
        tpl = await self.email_repo.get_by_key(key)
        if tpl:
            return await self.email_repo.update(tpl, data.model_dump())
        tpl = EmailTemplate(key=key, **data.model_dump())
        return await self.email_repo.create(tpl)

    async def update_email_template(self, key: str, data: EmailTemplateUpdate) -> EmailTemplate:
        tpl = await self.get_email_template(key)
        return await self.email_repo.update(tpl, data.model_dump(exclude_none=True))

    async def delete_email_template(self, key: str) -> None:
        tpl = await self.get_email_template(key)
        await self.email_repo.delete(tpl)

    # -- WhatsApp -------------------------------------------------------
    # (No create/delete: keys are fixed to what the codebase actually
    # fires — see DEFAULT_WHATSAPP_TEMPLATES. Admins edit, not invent.)

    async def list_whatsapp_templates(self) -> list[WhatsAppTemplate]:
        return await self.wa_repo.list_all()

    async def get_whatsapp_template(self, key: str) -> WhatsAppTemplate:
        tpl = await self.wa_repo.get_by_key(key)
        if not tpl:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WhatsApp template not found")
        return tpl

    async def update_whatsapp_template(self, key: str, data: WhatsAppTemplateUpdate) -> WhatsAppTemplate:
        tpl = await self.get_whatsapp_template(key)
        return await self.wa_repo.update(tpl, data.model_dump(exclude_none=True))

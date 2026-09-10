"""WhatsApp Cloud API service — order notifications + OTP.

Uses Meta WhatsApp Business Cloud API.
Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

Template names configured via env vars (see config.py / .env):
  WA_TEMPLATE_ORDER_CONFIRMED   params: customer_name, order_number, total_amount
  WA_TEMPLATE_ORDER_SHIPPED     params: customer_name, order_number, tracking_id
  WA_TEMPLATE_ORDER_CANCELLED   params: customer_name, order_number
  WA_TEMPLATE_ORDER_DELIVERED   params: customer_name, order_number
  WA_TEMPLATE_ORDER_OUT_DELIVERY params: customer_name, order_number
  WA_TEMPLATE_OTP               params: otp_code
"""

import logging
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)

WA_API_URL = "https://graph.facebook.com/v19.0/{phone_number_id}/messages"


class WhatsAppService:
    """Thin async wrapper around Meta WhatsApp Cloud API."""

    def __init__(self, db: Optional[AsyncSession] = None):
        self.token = settings.WHATSAPP_ACCESS_TOKEN
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        self.url = WA_API_URL.format(phone_number_id=self.phone_number_id)
        # When a db session is provided, template name/language are resolved
        # from the admin-editable WhatsAppTemplate table (falls back to the
        # .env defaults automatically if no row exists yet).
        self.db = db

    async def _resolve_template(self, key: str) -> tuple[str, str]:
        if self.db is not None:
            try:
                from app.services.template import get_whatsapp_template_config
                return await get_whatsapp_template_config(self.db, key)
            except Exception as exc:
                logger.warning("Falling back to .env WhatsApp template for '%s': %s", key, exc)
        # No db session available (or lookup failed) — use .env defaults.
        fallback = {
            "order_confirmed": settings.WA_TEMPLATE_ORDER_CONFIRMED,
            "order_shipped": settings.WA_TEMPLATE_ORDER_SHIPPED,
            "order_cancelled": settings.WA_TEMPLATE_ORDER_CANCELLED,
            "order_delivered": settings.WA_TEMPLATE_ORDER_DELIVERED,
            "order_out_for_delivery": settings.WA_TEMPLATE_ORDER_OUT_DELIVERY,
            "otp": settings.WA_TEMPLATE_OTP,
        }.get(key)
        if not fallback:
            raise ValueError(f"Unknown WhatsApp template key: {key}")
        return fallback, settings.WA_TEMPLATE_LANGUAGE

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _send(self, payload: dict) -> bool:
        """POST payload to the Cloud API. Returns True on success."""
        if not self.token or not self.phone_number_id:
            logger.warning("WhatsApp credentials not configured — skipping send.")
            return False

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(self.url, json=payload, headers=headers)
                if resp.status_code not in (200, 201):
                    logger.error("WhatsApp API error %s: %s", resp.status_code, resp.text)
                    return False
                return True
        except Exception as exc:
            logger.error("WhatsApp send exception: %s", exc)
            return False

    def _template_payload(
        self,
        to: str,
        template_name: str,
        language_code: str,
        components: Optional[list] = None,
    ) -> dict:
        """Build a template message payload."""
        # Normalise: strip spaces/dashes, add country code if missing
        to = to.strip().replace(" ", "").replace("-", "")
        if to.startswith("0"):
            to = "91" + to[1:]  # India default; change for other markets
        if to.startswith("+"):
            to = to[1:]  # Cloud API does not want the '+'

        msg: dict = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
            },
        }
        if components:
            msg["template"]["components"] = components
        return msg

    @staticmethod
    def _body_component(*texts: str) -> dict:
        """Build a body component with positional text parameters."""
        return {
            "type": "body",
            "parameters": [{"type": "text", "text": str(t)} for t in texts],
        }

    # ------------------------------------------------------------------
    # Order notification templates
    # ------------------------------------------------------------------

    async def send_order_confirmed(
        self, phone: str, customer_name: str, order_number: str, total_amount: str
    ) -> bool:
        template_name, language_code = await self._resolve_template("order_confirmed")
        payload = self._template_payload(
            phone,
            template_name=template_name,
            language_code=language_code,
            components=[self._body_component(customer_name, order_number, total_amount)],
        )
        return await self._send(payload)

    async def send_order_shipped(
        self, phone: str, customer_name: str, order_number: str, tracking_id: str = "N/A"
    ) -> bool:
        template_name, language_code = await self._resolve_template("order_shipped")
        payload = self._template_payload(
            phone,
            template_name=template_name,
            language_code=language_code,
            components=[self._body_component(customer_name, order_number, tracking_id)],
        )
        return await self._send(payload)

    async def send_order_cancelled(
        self, phone: str, customer_name: str, order_number: str
    ) -> bool:
        template_name, language_code = await self._resolve_template("order_cancelled")
        payload = self._template_payload(
            phone,
            template_name=template_name,
            language_code=language_code,
            components=[self._body_component(customer_name, order_number)],
        )
        return await self._send(payload)

    async def send_order_delivered(
        self, phone: str, customer_name: str, order_number: str
    ) -> bool:
        template_name, language_code = await self._resolve_template("order_delivered")
        payload = self._template_payload(
            phone,
            template_name=template_name,
            language_code=language_code,
            components=[self._body_component(customer_name, order_number)],
        )
        return await self._send(payload)

    async def send_order_out_for_delivery(
        self, phone: str, customer_name: str, order_number: str
    ) -> bool:
        template_name, language_code = await self._resolve_template("order_out_for_delivery")
        payload = self._template_payload(
            phone,
            template_name=template_name,
            language_code=language_code,
            components=[self._body_component(customer_name, order_number)],
        )
        return await self._send(payload)

    # ------------------------------------------------------------------
    # OTP
    # ------------------------------------------------------------------

    async def send_otp(self, phone: str, otp_code: str) -> bool:
        """Send OTP via WhatsApp template (otp_verification template)."""
        template_name, language_code = await self._resolve_template("otp")
        payload = self._template_payload(
            phone,
            template_name=template_name,
            language_code=language_code,
            components=[self._body_component(otp_code)],
        )
        return await self._send(payload)

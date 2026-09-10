import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Email templates
# ---------------------------------------------------------------------------

class EmailTemplateUpsert(BaseModel):
    """Create or fully replace an email template identified by `key`."""
    name: str
    subject: str
    html_body: str
    description: Optional[str] = None
    is_active: bool = True


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    html_body: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class EmailTemplateResponse(BaseModel):
    id: uuid.UUID
    key: str
    name: str
    subject: str
    html_body: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# WhatsApp templates
# ---------------------------------------------------------------------------

class WhatsAppTemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    language_code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class WhatsAppTemplateResponse(BaseModel):
    id: uuid.UUID
    key: str
    name: str
    template_name: str
    language_code: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

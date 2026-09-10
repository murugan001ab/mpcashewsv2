"""ImageKit.io integration for image uploads.

Replaces the old local-disk upload (app/utils/file_upload.py) — that saved
files under UPLOAD_DIR, but main.py never actually mounted a /static route
to serve them, so uploaded product images were never reachable by URL.
ImageKit gives us a real CDN URL back immediately on upload.

Docs: https://docs.imagekit.io/api-reference/upload-file-api/server-side-file-upload
      https://docs.imagekit.io/api-reference/media-api/delete-file
"""
import io
import logging
import uuid
from typing import Optional

import httpx
from fastapi import UploadFile, HTTPException, status
from PIL import Image

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024

IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload"
IMAGEKIT_FILES_URL = "https://api.imagekit.io/v1/files"


def _auth() -> tuple[str, str]:
    """ImageKit's server-side API uses HTTP Basic auth with the private key
    as the username and an empty password."""
    return (settings.IMAGEKIT_PRIVATE_KEY, "")


async def upload_image(file: UploadFile, folder: str = "products") -> tuple[str, str]:
    """Validate and upload an image to ImageKit.

    Returns (url, file_id). file_id is stored so the image can later be
    deleted from ImageKit itself, not just unlinked from our DB.
    """
    if not settings.IMAGEKIT_PRIVATE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image upload is not configured (missing ImageKit credentials).",
        )

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not allowed. Use JPEG, PNG or WebP.",
        )

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit.",
        )

    # Validate it's actually a readable image before spending an upload call on it
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    file_name = f"{uuid.uuid4()}.{ext}"

    data = {
        "fileName": file_name,
        "folder": f"/{folder.strip('/')}",
        "useUniqueFileName": "false",
    }
    files = {"file": (file_name, content, file.content_type)}

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(IMAGEKIT_UPLOAD_URL, data=data, files=files, auth=_auth())
    except httpx.HTTPError as exc:
        logger.error("ImageKit upload request failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Image upload failed.")

    if resp.status_code not in (200, 201):
        logger.error("ImageKit upload failed %s: %s", resp.status_code, resp.text)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Image upload failed.")

    body = resp.json()
    return body["url"], body["fileId"]


async def delete_image(file_id: Optional[str]) -> None:
    """Best-effort delete. A missing file_id (e.g. images that predate the
    ImageKit switch, or credentials not configured) is silently skipped
    rather than raising — losing the ability to delete a stray remote file
    shouldn't block deleting our own DB record."""
    if not file_id or not settings.IMAGEKIT_PRIVATE_KEY:
        return
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.delete(f"{IMAGEKIT_FILES_URL}/{file_id}", auth=_auth())
    except httpx.HTTPError as exc:
        logger.warning("ImageKit delete request failed for %s: %s", file_id, exc)
        return
    if resp.status_code not in (200, 204, 404):
        logger.warning("ImageKit delete failed for %s: %s %s", file_id, resp.status_code, resp.text)

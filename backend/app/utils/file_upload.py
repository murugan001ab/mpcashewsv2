import os
import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile, HTTPException, status
from PIL import Image
import io

from app.core.config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


async def save_upload_file(file: UploadFile, subfolder: str = "products") -> str:
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

    # Validate image
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    upload_path = Path(settings.UPLOAD_DIR) / subfolder
    upload_path.mkdir(parents=True, exist_ok=True)
    file_path = upload_path / filename

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return f"/static/uploads/{subfolder}/{filename}"


async def delete_upload_file(url: str) -> None:
    if url.startswith("/static/"):
        file_path = Path(url.lstrip("/"))
        if file_path.exists():
            file_path.unlink()

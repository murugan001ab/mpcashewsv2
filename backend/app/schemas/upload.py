from pydantic import BaseModel


class ImageUploadResponse(BaseModel):
    """Returned by the generic admin image-upload endpoint. `url` is the
    ImageKit CDN URL to store wherever it's needed (e.g. Category.image_url);
    `file_id` is only useful if the caller wants to delete it later via
    app.utils.imagekit.delete_image."""
    url: str
    file_id: str

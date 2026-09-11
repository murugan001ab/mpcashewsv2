// src/utils/cropImage.ts
// Takes the pixel crop rect react-easy-crop reports (relative to the
// original image's natural resolution) and bakes it into a single canvas
// draw, resized to the target output dimensions — so what we upload is
// exactly `outputWidth`x`outputHeight`, not whatever size the admin's
// original photo happened to be.
export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export async function getCroppedImageFile(
  imageSrc: string,
  crop: PixelCrop,
  outputWidth: number,
  outputHeight: number,
  fileName: string,
  mimeType: string = "image/jpeg",
  quality: number = 0.9
): Promise<File> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Single draw: source rect is the crop area (in the original image's
  // natural pixel space), destination is the full output canvas — this is
  // what does the resize + crop in one pass.
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      mimeType,
      quality
    );
  });

  // Keep a sane extension/name regardless of what the admin's original
  // file was called (e.g. a .png or .heic source still uploads as .jpg
  // once re-encoded here).
  const base = fileName.replace(/\.[^.]+$/, "");
  const ext = mimeType === "image/png" ? "png" : "jpg";
  return new File([blob], `${base}-cropped.${ext}`, { type: mimeType });
}

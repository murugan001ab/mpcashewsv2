"use client";
// src/components/admin/ImageCropModal.tsx
// Shared crop step used by every admin image picker (auth slides, product
// images, category images) so an oversized/wrong-shaped photo gets framed
// by the admin instead of silently squished by CSS object-cover at display
// time. Each caller just passes the aspect ratio + output pixel size that
// spot actually renders at — see the `aspect`/`outputWidth`/`outputHeight`
// props on each usage for what those are.
import { useCallback, useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Loader2, ZoomIn } from "lucide-react";
import { Modal, Button } from "./ui";
import { getCroppedImageFile, PixelCrop } from "@/utils/cropImage";

interface ImageCropModalProps {
  open: boolean;
  file: File | null;
  aspect: number; // width / height, e.g. 1 for square, 4/5 for the auth-slide portrait panel
  outputWidth: number;
  outputHeight: number;
  title?: string;
  onCancel: () => void;
  onCropped: (croppedFile: File) => void;
}

export default function ImageCropModal({
  open,
  file,
  aspect,
  outputWidth,
  outputHeight,
  title = "Crop image",
  onCancel,
  onCropped,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [processing, setProcessing] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // One object URL per `file`, revoked on cleanup — creating a fresh one
  // every render (instead of tying it to file via an effect) would leak a
  // blob URL on every re-render while the modal is open.
  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Known react-easy-crop issue when mounted inside a modal: it measures
  // its container's size once on mount to compute drag bounds, and that
  // measurement can run a frame before the modal has actually settled into
  // final layout — leaving pan bounds effectively zeroed out. Zoom still
  // works because it's just a prop-driven CSS transform, not dependent on
  // that measurement. Firing a resize event a tick after mount forces the
  // library to recompute against the real, settled layout.
  useEffect(() => {
    if (!objectUrl) return;
    const id = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    return () => cancelAnimationFrame(id);
  }, [objectUrl]);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleConfirm = async () => {
    if (!file || !objectUrl || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const cropped = await getCroppedImageFile(
        objectUrl,
        croppedAreaPixels,
        outputWidth,
        outputHeight,
        file.name
      );
      reset();
      onCropped(cropped);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal open={open && !!file} onClose={handleCancel} title={title} width="max-w-lg">
      <div className="space-y-4">
        <div className="relative w-full h-80 bg-brand-black/90 rounded-xl overflow-hidden">
          {objectUrl && (
            <Cropper
              image={objectUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn size={15} className="text-brand-brown/50 shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-brand-orange"
          />
        </div>

        <p className="text-[11px] text-brand-brown/45">
          Drag to reposition, use the slider to zoom. Exports at {outputWidth}×{outputHeight}px.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={handleCancel} disabled={processing}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={handleConfirm} disabled={processing || !croppedAreaPixels}>
            {processing ? <Loader2 size={15} className="animate-spin" /> : "Use photo"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

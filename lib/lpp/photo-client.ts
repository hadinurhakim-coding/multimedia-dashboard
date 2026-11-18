"use client";

import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "./photo-policy";

export const MAX_UPLOAD_IMAGE_DIMENSION = 1600;
export const CLIENT_JPEG_QUALITY = 0.85;
const MAX_RAW_CLIENT_DECODE_BYTES = 25 * 1024 * 1024;
const PHOTO_ERROR_MESSAGE = "Pilih foto JPG, PNG, atau WebP maksimal 4 MB.";

const preparedFiles = new WeakSet<File>();

/** Calculates target pixel dimensions inside maxDimension while keeping aspect ratio. */
export function computeConstrainedDimensions(
  width: number,
  height: number,
  maxDimension = MAX_UPLOAD_IMAGE_DIMENSION
): { width: number; height: number } {
  if (!(width > 0 && height > 0 && maxDimension > 0)) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeImageSource(
  file: File
): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall back to HTMLImageElement if imageOrientation options fail.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Image decode failed"));
      element.src = objectUrl;
    });
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

/** Resizes and JPEG-compresses valid photos in the browser before upload, falling back cleanly on error. */
export async function preparePhotoForUpload(file: File): Promise<File> {
  if (
    preparedFiles.has(file) ||
    typeof window === "undefined" ||
    !PHOTO_TYPES.includes(file.type) ||
    !file.size ||
    file.size > MAX_RAW_CLIENT_DECODE_BYTES
  ) {
    return file;
  }

  let decoded: Awaited<ReturnType<typeof decodeImageSource>> | null = null;
  try {
    decoded = await decodeImageSource(file);
    const { width: targetWidth, height: targetHeight } = computeConstrainedDimensions(
      decoded.width,
      decoded.height,
      MAX_UPLOAD_IMAGE_DIMENSION
    );
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // Flatten transparency onto white to match server-side Sharp normalization.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    decoded.draw(ctx, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CLIENT_JPEG_QUALITY)
    );
    if (!blob || !blob.size) return file;

    const needsResize = decoded.width > MAX_UPLOAD_IMAGE_DIMENSION || decoded.height > MAX_UPLOAD_IMAGE_DIMENSION;
    if (blob.size >= file.size && !needsResize && file.type === "image/jpeg") {
      preparedFiles.add(file);
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    const compressed = new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
    preparedFiles.add(compressed);
    return compressed;
  } catch {
    return file;
  } finally {
    decoded?.cleanup();
  }
}

/** Validates image MIME type, applies client resize/compression, and checks the 4 MB upload cap. */
export async function prepareValidatedPhotoUpload(
  file: File
): Promise<{ ok: true; file: File } | { ok: false; error: string }> {
  if (!PHOTO_TYPES.includes(file.type) || !file.size || file.size > MAX_RAW_CLIENT_DECODE_BYTES) {
    return { ok: false, error: PHOTO_ERROR_MESSAGE };
  }
  const prepared = await preparePhotoForUpload(file);
  if (!PHOTO_TYPES.includes(prepared.type) || !prepared.size || prepared.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: PHOTO_ERROR_MESSAGE };
  }
  return { ok: true, file: prepared };
}

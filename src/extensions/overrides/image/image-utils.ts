import { IMAGE_MAX_WIDTH, IMAGE_QUALITY } from "@/utils/constants";

function getScaledSize(
  width: number,
  height: number,
  maxWidth: number,
): { width: number; height: number } {
  if (width <= maxWidth) return { width, height };

  return {
    width: maxWidth,
    height: Math.round((height * maxWidth) / width),
  };
}

async function compressImage(
  blob: Blob,
  maxWidth = IMAGE_MAX_WIDTH,
  quality = IMAGE_QUALITY,
): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(blob);
  try {
    const { width, height } = getScaledSize(
      bitmap.width,
      bitmap.height,
      maxWidth,
    );
    const canvas = new OffscreenCanvas(
      Math.max(1, Math.round(width)),
      Math.max(1, Math.round(height)),
    );
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Couldn't get canvas context");
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const outputBlob = await canvas.convertToBlob({
      type: "image/webp",
      quality,
    });
    canvas.width = 0;
    canvas.height = 0;
    const buffer = await outputBlob.arrayBuffer();
    return new Uint8Array(buffer);
  } finally {
    bitmap.close();
  }
}

export { compressImage };

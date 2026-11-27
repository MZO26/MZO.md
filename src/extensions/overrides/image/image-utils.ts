import { IMAGE_MAX_WIDTH, IMAGE_QUALITY } from "@/utils/constants";

function getScaledSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function compressImage(
  blob: Blob,
  maxWidth = IMAGE_MAX_WIDTH,
  quality = IMAGE_QUALITY,
): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(blob);
  try {
    const { width, height } = getScaledSize(bitmap.width, bitmap.height, maxWidth);
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't get canvas context");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    const out = await canvas.convertToBlob({
      type: "image/webp",
      quality,
    });
    canvas.width = 0;
    canvas.height = 0;
    const resized = w !== bitmap.width || h !== bitmap.height;
    const result = !resized && out.size >= blob.size ? blob : out;
    return new Uint8Array(await result.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

export { compressImage };

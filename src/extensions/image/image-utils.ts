import { WorkerTaskError } from "@/utils/workers/worker-factory";
import { IMAGE_MAX_WIDTH, IMAGE_QUALITY } from "@shared/constants";
import { WorkerErrorCode } from "@shared/errors";

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
  const bitmap = await createImageBitmap(blob).catch(() => {
    throw new WorkerTaskError(WorkerErrorCode.InvalidImageError);
  });
  let { width, height } = getScaledSize(bitmap.width, bitmap.height, maxWidth);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new WorkerTaskError(WorkerErrorCode.CompressionError);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const outputBlob = await canvas
    .convertToBlob({ type: "image/webp", quality })
    .catch(() => {
      throw new WorkerTaskError(WorkerErrorCode.CompressionError);
    });
  const buffer = await outputBlob.arrayBuffer();
  canvas.width = 0;
  canvas.height = 0;
  return new Uint8Array(buffer);
}

export { compressImage };

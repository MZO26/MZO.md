import { WorkerTaskError } from "@/extensions/image/image-worker";
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
  file: File,
  maxWidth = 1400,
  quality = 0.9,
): Promise<Uint8Array> {
  // decodes the image file into a drawable ImageBitmap object, ready to be drawn onto a canvas
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new WorkerTaskError(WorkerErrorCode.InvalidImageError);
  });
  // starts with original image dimensions. If image is wider than maxWidth it recalculates height so the aspect ratio stays the same, while width gets set to maxWidth
  let { width, height } = getScaledSize(bitmap.width, bitmap.height, maxWidth);
  // creates an offscreen canvas with the new set width and height. offscreen because it works without inserting a visible canvas element on the page. it creates an in-memory drawing surface to redraw the original image at a smaller size. This is perfect for offloading it to a worker
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new WorkerTaskError(WorkerErrorCode.CompressionError);
  }
  // resizing step and afterwards closing of bitmap to clean up. bitmap as image source, 0, 0 for x and y so it fills the entire canvas because it already was created with the exact width and height. The last to arguments tell the canvas how big to stretch or shrink it
  ctx.drawImage(bitmap, 0, 0, width, height); // ctx represents the drawing interface
  bitmap.close();
  // encode canvas pixels into compressed webp file. the blob holds the fully compressed file data, but hides the bytes behind an unreadable interface
  const blob = await canvas
    .convertToBlob({ type: "image/webp", quality })
    .catch(() => {
      throw new WorkerTaskError(WorkerErrorCode.CompressionError);
    });
  console.log(blob.type);
  // because you can't access bytes inside blob, it gets turned into an arrayBuffer. (blob contains metadata and acts as a reference, arrayBuffer is the actual memory)
  const buffer = await blob.arrayBuffer();
  canvas.width = 0;
  canvas.height = 0;
  // reaturn as Uint8Array, which is perfect for sending data over the IPC bridge. It enables reading of the buffer byte-by-byte
  return new Uint8Array(buffer);
}

export { compressImage };

import { createWorker } from "@/utils/workers/worker-factory";
import type { ImageCompressionPayload, WorkerResult } from "@shared/types";

const imageWorker =
  typeof window !== "undefined"
    ? new Worker(new URL("./worker-image.ts", import.meta.url), {
        type: "module",
      })
    : null;

const workOnImageCompression = createWorker<
  ImageCompressionPayload,
  Uint8Array
>(imageWorker);

// wrapper around worker to get arrayBuffer

async function compressImageInWorker(
  file: File,
  maxWidth = 1000,
  quality = 0.9,
): Promise<WorkerResult<Uint8Array>> {
  const arrayBuffer = await file.arrayBuffer();
  return workOnImageCompression(
    {
      buffer: arrayBuffer,
      mimeType: file.type,
      maxWidth,
      quality,
    },
    [arrayBuffer],
  );
}

export { compressImageInWorker, imageWorker, workOnImageCompression };

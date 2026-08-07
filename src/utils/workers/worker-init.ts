import { IMAGE_MAX_WIDTH, IMAGE_QUALITY } from "@/utils/constants";
import type { ImageCompressionPayload, WorkerResult } from "@/utils/types";
import { createWorker } from "@/utils/workers/worker-factory";

const imageWorker =
  typeof window !== "undefined"
    ? new Worker(new URL("./worker-image.ts", import.meta.url), {
        type: "module",
      })
    : null;

const markdownWorker =
  typeof window !== "undefined"
    ? new Worker(new URL("./worker-markdown.ts", import.meta.url), {
        type: "module",
      })
    : null;

const workOnMarkdownParsing = createWorker<string, string>(markdownWorker);

const workOnImageCompression = createWorker<
  ImageCompressionPayload,
  Uint8Array
>(imageWorker);

// wrapper around worker to get arrayBuffer

async function compressImageInWorker(
  file: File,
  maxWidth: number = IMAGE_MAX_WIDTH,
  quality: number = IMAGE_QUALITY,
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

export {
  compressImageInWorker,
  imageWorker,
  markdownWorker,
  workOnImageCompression,
  workOnMarkdownParsing,
};

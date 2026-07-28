/// <reference lib="webworker" />
import { compressImage } from "@/extensions/image/image-utils";
import { handleWorkerError } from "@/utils/workers/worker-factory";
import type {
  Expand,
  ImageCompressionPayload,
  WorkerRequest,
} from "@shared/types";

self.onmessage = async (
  e: MessageEvent<
    Expand<{ id: string } & WorkerRequest<ImageCompressionPayload>>
  >,
) => {
  const { id, payload } = e.data;
  const { buffer, mimeType, maxWidth, quality } = payload;
  try {
    const blob = new Blob([buffer], { type: mimeType });
    const result = await compressImage(blob, maxWidth, quality);
    self.postMessage({ id, success: true, data: result }, [result.buffer]);
  } catch (error) {
    self.postMessage({
      id,
      ...handleWorkerError(error),
    });
  }
};

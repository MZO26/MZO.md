/// <reference lib="webworker" />
import { compressImage } from "@/extensions/image/image-utils";

self.onmessage = async (e: MessageEvent) => {
  const { id, file, maxWidth, quality } = e.data;

  try {
    const response = await compressImage(file, maxWidth, quality);
    self.postMessage({ id, success: true, data: response }, [response.buffer]);
  } catch (error) {
    self.postMessage({ id, ...handleWorkerError(error) });
  }
};

enum WorkerError {
  CompressionError = "COMPRESSION_FAILED",
  InvalidImageError = "INVALID_IMAGE",
  UnknownError = "UNKNOWN_ERROR",
}

function handleWorkerError(err: unknown): { success: false; message: string } {
  const errorCode =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : WorkerError.UnknownError;
  console.error("[WORKER]: ", errorCode);

  switch (errorCode) {
    case WorkerError.CompressionError:
      return { success: false, message: "Could not compress the image." };

    case WorkerError.InvalidImageError:
      return {
        success: false,
        message: "This image could not be read.",
      };

    case WorkerError.UnknownError:
    default:
      return { success: false, message: "Could not process the image." };
  }
}

/// <reference lib="webworker" />
import { getMarkdownManager } from "@/components/editor/editor-actions";
import type { WorkerRequest } from "@/utils/types";
import { handleWorkerError } from "@/utils/workers/worker-factory";
import { WorkerErrorCode } from "@shared/errors";
import type { Id } from "@shared/schemas/note-schema";

self.onmessage = async (
  e: MessageEvent<{ id: Id } & WorkerRequest<{ markdown: string }>>,
) => {
  const { id, payload } = e.data;
  if (typeof payload !== "string") {
    self.postMessage({
      success: false,
      error: WorkerErrorCode.InvalidDataError,
    });
    return;
  }
  try {
    const result = getMarkdownManager().parse(payload);
    const stringified = JSON.stringify(result);
    self.postMessage({ id, success: true, data: stringified });
  } catch (error) {
    self.postMessage({
      id,
      ...handleWorkerError(error),
    });
  }
};

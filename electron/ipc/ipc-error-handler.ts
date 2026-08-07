import { mainLogger } from "@electron/handler/permission-handler";
import { AppErrorCode } from "@shared/errors";
import type { Failure } from "@shared/shared-types";
import { ZodError } from "zod";

class AppBackendError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message?: string,
  ) {
    super(message || code);
    this.name = "AppBackendError";
  }
}

function handleIpcError(error: unknown): Failure {
  if (error instanceof AppBackendError) {
    return {
      success: false,
      error: error.code,
    };
  }
  if (error instanceof ZodError) {
    return {
      success: false,
      error: AppErrorCode.InvalidData,
    };
  }
  mainLogger.appError("[IPC Unknown Error]:", error);
  return {
    success: false,
    error: AppErrorCode.UnknownError,
  };
}
export { AppBackendError, handleIpcError };

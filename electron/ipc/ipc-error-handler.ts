import { AppErrorCode } from "@shared/constants";
import type { Failure } from "@shared/types";
import z, { ZodError } from "zod";

class AppBackendError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message?: string,
  ) {
    super(message || code);
    this.name = "AppBackendError";
  }
}

function handleIpcError(err: unknown): Failure {
  if (err instanceof AppBackendError) {
    return {
      success: false,
      error: err.code,
    };
  }
  if (err instanceof ZodError) {
    console.error(
      "[IPC Validation]:",
      JSON.stringify(z.treeifyError(err), null, 2),
    );
    return {
      success: false,
      error: AppErrorCode.InvalidData,
    };
  }
  console.error("[IPC ERROR]: ", err);
  return {
    success: false,
    error: AppErrorCode.UnknownError,
  };
}
export { AppBackendError, handleIpcError };

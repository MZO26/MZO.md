class AppBackendError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message?: string,
  ) {
    super(message || code);
    this.name = "AppBackendError";
  }
}

class WorkerTaskError extends Error {
  constructor(
    public readonly code: WorkerErrorCode,
    message?: string,
  ) {
    super(message || code);
    this.name = "WorkerTaskError";
  }
}

function handleWorkerError(err: unknown): {
  success: false;
  error: WorkerErrorCode;
} {
  if (err instanceof WorkerTaskError) {
    return { success: false, error: err.code };
  }
  return {
    success: false,
    error: WorkerErrorCode.UnknownError,
  };
}

enum WorkerErrorCode {
  InitializeError = "INIT_ERROR",
  CompressionError = "COMPRESSION_FAILED",
  InvalidImageError = "INVALID_IMAGE",
  UnknownError = "UNKNOWN_ERROR",
  TimeoutError = "TIMEOUT_ERROR",
  InvalidDataError = "INVALID_DATA",
}

enum AppErrorCode {
  DBError = "DB_ERROR",
  InvalidData = "INVALID_DATA",
  FileWriteError = "FILE_WRITE_ERROR",
  RateLimitError = "RATE_LIMIT",
  SenderError = "UNAUTHORIZED_SENDER",
  UnknownError = "UNKNOWN_ERROR",
  CancelledOperation = "CANCELLED_OPERATION",
  ExportError = "EXPORT_ERROR",
}

const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  [AppErrorCode.DBError]: "Failed to access database.",
  [AppErrorCode.InvalidData]: "Couldn't read the notes' data.",
  [AppErrorCode.FileWriteError]: "Failed to write file.",
  [AppErrorCode.RateLimitError]: "Too many attempts. Please wait.",
  [AppErrorCode.SenderError]: "Action blocked for security.",
  [AppErrorCode.UnknownError]: "An unexpected error occurred.",
  [AppErrorCode.CancelledOperation]: "Operation cancelled.",
  [AppErrorCode.ExportError]: "Export failed.",
};

export {
  AppBackendError,
  AppErrorCode,
  ERROR_MESSAGES,
  handleWorkerError,
  WorkerErrorCode,
};

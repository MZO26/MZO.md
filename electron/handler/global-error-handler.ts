interface ErrorHandlerOptions {
  ignore?: string[];
}

function setupGlobalErrorHandling({ ignore = [] }: ErrorHandlerOptions = {}) {
  process.on("unhandledRejection", (reason) => {
    const errorMsg = reason instanceof Error ? reason.message : String(reason);
    const shouldIgnore =
      ignore.length > 0 && ignore.some((pattern) => errorMsg.includes(pattern));
    if (shouldIgnore) {
      return;
    }
    console.error("[Unhandled Promise Rejection]: ", reason);
  });
  process.on("uncaughtException", (error) => {
    console.error("[Uncaught Exception]:", error);
  });
}

export { setupGlobalErrorHandling };

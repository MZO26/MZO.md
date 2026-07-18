function setupGlobalErrorHandling({ ignore = [] }: { ignore?: string[] } = {}) {
  process.on("unhandledRejection", (reason) => {
    const errorMsg = reason instanceof Error ? reason.message : String(reason);
    if (ignore.some((pattern) => errorMsg.includes(pattern))) return;
    console.error("[Unhandled Promise Rejection]:", reason);
  });
  process.on("uncaughtException", (error) => {
    console.error("[Uncaught Exception]:", error);
  });
}
export { setupGlobalErrorHandling };

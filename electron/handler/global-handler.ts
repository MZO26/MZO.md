import { mainLogger } from "@electron/handler/permission-handler";

function setupGlobalErrorHandling({ ignore = [] }: { ignore: string[] }) {
  process.on("unhandledRejection", (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    if (ignore.some((pattern) => msg.includes(pattern))) return;
    mainLogger.appError("[Unhandled Promise Rejection]:", reason);
  });
  process.on("uncaughtException", (error) => {
    const msg = error instanceof Error ? error.message : String(error);
    if (ignore.some((pattern) => msg.includes(pattern))) return;
    mainLogger.appError("[Uncaught Exception]:", error);
  });
}

export { setupGlobalErrorHandling };

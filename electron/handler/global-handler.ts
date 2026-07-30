import { mainLogger } from "@electron/handler/permission-handler";

function setupGlobalErrorHandling({ ignore = [] }: { ignore: string[] }) {
  process.on("unhandledRejection", (reason) => {
    const errorMsg = reason instanceof Error ? reason.message : String(reason);
    if (ignore.some((pattern) => errorMsg.includes(pattern))) return;
    mainLogger.appError("[Unhandled Promise Rejection]:", reason);
  });
  process.on("uncaughtException", (error) => {
    mainLogger.appError("[Uncaught Exception]:", error);
  });
}

export { setupGlobalErrorHandling };

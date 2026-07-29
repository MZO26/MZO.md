import { appError } from "@shared/constants";

function setupGlobalErrorHandling({ ignore = [] }: { ignore: string[] }) {
  process.on("unhandledRejection", (reason) => {
    const errorMsg = reason instanceof Error ? reason.message : String(reason);
    if (ignore.some((pattern) => errorMsg.includes(pattern))) return;
    appError("[Unhandled Promise Rejection]:", reason);
  });
  process.on("uncaughtException", (error) => {
    appError("[Uncaught Exception]:", error);
  });
}

export { setupGlobalErrorHandling };

import { safeInvoke } from "@/utils/ipc";
import type { ExportRequest } from "@shared/schemas/export-schema";
import type { IpcResponse } from "@shared/types";

async function exportNote(
  payload: ExportRequest,
): Promise<IpcResponse<ExportRequest>> {
  return safeInvoke(window.exportAPI.noteExport(payload));
}

export { exportNote };

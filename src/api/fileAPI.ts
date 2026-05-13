import { safeInvoke } from "@/utils/ipc";
import type {
  ExportManyRequest,
  ExportRequest,
  ImportRequest,
} from "@shared/schemas/export-schema";
import type { IpcResponse } from "@shared/types";

async function exportNote(
  payload: ExportRequest,
): Promise<IpcResponse<ExportRequest>> {
  return safeInvoke(window.fileAPI.noteExport(payload));
}

async function exportManyNotes(
  payload: ExportManyRequest,
): Promise<IpcResponse<ExportManyRequest>> {
  return safeInvoke(window.fileAPI.noteExportMany(payload));
}

async function importNote(): Promise<IpcResponse<ImportRequest[]>> {
  return safeInvoke(window.fileAPI.noteImport());
}

export { exportManyNotes, exportNote, importNote };

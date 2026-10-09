import { rendererLogger } from "@/app";
import { AppErrorCode } from "@shared/errors";
import type {
  Notification,
  Url,
  ZoomAction,
} from "@shared/schemas/electron-schema";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type {
  CreateNotePayload,
  Id,
  Note,
  NoteListItem,
  RelatedNotes,
  SearchQuery,
  SearchResult,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type {
  ExportContent,
  ExportRequest,
  FilePathRequest,
  ImportRequest,
} from "@shared/schemas/request-schema";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import type { ImportStats, Result } from "@shared/shared-types";

function isResult(obj: unknown): obj is Result<unknown> {
  if (typeof obj !== "object" || obj === null || !("success" in obj))
    return false;
  if (obj.success === true) return "data" in obj;
  if (obj.success === false) return "error" in obj;
  return false;
}

async function invoke<T>(promise: Promise<Result<T>>): Promise<Result<T>> {
  try {
    const result = await promise;
    if (!isResult(result)) {
      rendererLogger.appError("[IPC Bridge Error]: Invalid result format");
      return { success: false, error: AppErrorCode.UnknownError };
    }
    return result;
  } catch (err: unknown) {
    rendererLogger.appError("[IPC Bridge Error]: ", err);
    return { success: false, error: AppErrorCode.UnknownError };
  }
}

// note api

async function search(query: SearchQuery): Promise<Result<SearchResult[]>> {
  return invoke(window.noteAPI.search(query));
}

async function getAll(): Promise<Result<readonly NoteListItem[]>> {
  return invoke(window.noteAPI.getAll());
}

async function getAllBackup(): Promise<Result<readonly Note[]>> {
  return invoke(window.noteAPI.getAllBackup());
}

async function createNote(
  payload: CreateNotePayload,
): Promise<Result<NoteListItem>> {
  return invoke(window.noteAPI.create(payload));
}

async function createManyNotes(
  payload: CreateNotePayload[],
): Promise<Result<readonly NoteListItem[]>> {
  return invoke(window.noteAPI.createMany(payload));
}

async function updateNote(
  note: UpdateNotePayload,
  flush: boolean,
): Promise<Result<NoteListItem>> {
  return invoke(window.noteAPI.update(note, flush));
}

async function deleteNote(id: Id): Promise<Result<void>> {
  return invoke(window.noteAPI.delete(id));
}

async function deleteManyNotes(ids: Id[]): Promise<Result<void>> {
  return invoke(window.noteAPI.deleteMany(ids));
}

async function getNoteById(id: Id): Promise<Result<Readonly<Note>>> {
  return invoke(window.noteAPI.getById(id));
}

async function getManyById(ids: Id[]): Promise<Result<readonly Note[]>> {
  return invoke(window.noteAPI.getManyById(ids));
}

async function exportNote(
  payload: ExportRequest,
): Promise<Result<ExportRequest>> {
  return invoke(window.noteAPI.noteExport(payload));
}

async function exportManyNotes(
  payload: ExportContent[],
): Promise<Result<ExportContent[]>> {
  return invoke(window.noteAPI.noteExportMany(payload));
}

async function importNote(
  payload: FilePathRequest,
): Promise<Result<{ data: ImportRequest[]; stats: ImportStats }>> {
  return invoke(window.noteAPI.noteImport(payload));
}

async function pin(id: Id): Promise<Result<boolean>> {
  return invoke(window.noteAPI.pin(id));
}

async function pinMany(ids: Id[]): Promise<Result<boolean>> {
  return invoke(window.noteAPI.pinMany(ids));
}

async function getRelatedNotes(payload: {
  id: Id;
}): Promise<Result<RelatedNotes[]>> {
  return invoke(window.noteAPI.getRelatedNotes(payload));
}

async function databaseBackup(): Promise<Result<number>> {
  return invoke(window.noteAPI.databaseBackup());
}

async function databaseBackupRestore(): Promise<Result<void>> {
  return invoke(window.noteAPI.databaseBackupRestore());
}

// settings api

async function getSettings<K extends keyof Readonly<AppSettings>>(
  key: K,
): Promise<Result<Readonly<AppSettings[K]>>> {
  return invoke(window.storeAPI.getSettings(key));
}

async function getAllSettings(): Promise<Result<Readonly<AppSettings>>> {
  return invoke(window.storeAPI.getAllSettings());
}

async function setSettings(
  settings: Partial<Readonly<AppSettings>>,
): Promise<Result<Readonly<AppSettings>>> {
  return invoke(window.storeAPI.setSettings(settings));
}

// electron api

async function setTheme(
  theme: Readonly<Theme>,
  focus?: boolean,
): Promise<Result<Exclude<Theme, "system">>> {
  return invoke(window.electronAPI.setTheme(theme, focus));
}

async function showNotification(
  title: Notification["title"],
  body: Notification["body"],
): Promise<Result<void>> {
  return invoke(window.electronAPI.showNotification(title, body));
}

async function imageWriteMany(
  payload: ImagePayload[],
): Promise<Result<{ imageSrc: string }[]>> {
  return invoke(window.electronAPI.imageWriteMany(payload));
}

async function handleZoom(action: ZoomAction): Promise<Result<number>> {
  return invoke(window.electronAPI.zoom(action));
}

async function openExternal(url: Url): Promise<Result<string | void>> {
  return invoke(window.electronAPI.openExternal(url));
}

async function openAppPath(): Promise<Result<boolean>> {
  return invoke(window.electronAPI.openAppPath());
}

async function pinWindow(): Promise<Result<boolean>> {
  return invoke(window.electronAPI.windowPin());
}

export {
  createManyNotes,
  createNote,
  databaseBackup,
  databaseBackupRestore,
  deleteManyNotes,
  deleteNote,
  exportManyNotes,
  exportNote,
  getAll,
  getAllBackup,
  getAllSettings,
  getManyById,
  getNoteById,
  getRelatedNotes,
  getSettings,
  handleZoom,
  imageWriteMany,
  importNote,
  openAppPath,
  openExternal,
  pin,
  pinMany,
  pinWindow,
  search,
  setSettings,
  setTheme,
  showNotification,
  updateNote,
};

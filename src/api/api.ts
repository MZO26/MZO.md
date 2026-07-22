import { settingsStore } from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { DEBOUNCE_MS } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type {
  CreateNotePayload,
  Note,
  NoteListItem,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type {
  ExportRequest,
  FilePathRequest,
  ImportRequest,
  OpenAutoExportPathRequest,
  SyncRequestPayload,
} from "@shared/schemas/request-schema";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import type {
  ExportedContent,
  ImportStats,
  Result,
  SyncResult,
  ZoomAction,
} from "@shared/types";

// only really needed for extra error catching if something goes through IPC Bridge which shouldn't happen

async function invoke<T>(ipcPromise: Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await ipcPromise;
  } catch (err: unknown) {
    console.error("[IPC Bridge Error]: ", err);
    return { success: false, error: AppErrorCode.UnknownError };
  }
}

//----------------------------------------------------------

// note api

async function getAll(): Promise<Result<NoteListItem[]>> {
  return invoke(window.noteAPI.getAll());
}

async function getAllBackup(): Promise<Result<Note[]>> {
  return invoke(window.noteAPI.getAllBackup());
}

async function createNote(
  payload: CreateNotePayload,
): Promise<Result<NoteListItem>> {
  return invoke(window.noteAPI.create(payload));
}

async function createManyNotes(
  payload: CreateNotePayload[],
): Promise<Result<NoteListItem[]>> {
  return invoke(window.noteAPI.createMany(payload));
}

async function updateNote(
  note: UpdateNotePayload,
  flush: boolean,
): Promise<Result<NoteListItem>> {
  return invoke(window.noteAPI.update(note, flush));
}

async function deleteNote(id: string): Promise<Result<void>> {
  return invoke(window.noteAPI.delete(id));
}

async function deleteManyNotes(ids: string[]): Promise<Result<void>> {
  return invoke(window.noteAPI.deleteMany(ids));
}

async function getNoteById(id: string): Promise<Result<Note>> {
  return invoke(window.noteAPI.getById(id));
}

async function getManyById(ids: string[]): Promise<Result<Note[]>> {
  return invoke(window.noteAPI.getManyById(ids));
}

async function exportNote(
  payload: ExportRequest,
): Promise<Result<ExportRequest>> {
  return invoke(window.noteAPI.noteExport(payload));
}

async function exportManyNotes(
  payload: ExportedContent[],
): Promise<Result<ExportedContent[]>> {
  return invoke(window.noteAPI.noteExportMany(payload));
}

async function importNote(
  payload: FilePathRequest,
): Promise<Result<{ data: ImportRequest[]; stats: ImportStats }>> {
  return invoke(window.noteAPI.noteImport(payload));
}

async function pin(id: string): Promise<Result<boolean>> {
  return invoke(window.noteAPI.pin(id));
}

async function pinMany(ids: string[]): Promise<Result<boolean>> {
  return invoke(window.noteAPI.pinMany(ids));
}

async function syncRequest(
  payload: SyncRequestPayload,
): Promise<Result<SyncResult>> {
  return invoke(window.noteAPI.syncRequest(payload));
}

async function databaseBackup(): Promise<Result<number>> {
  return invoke(window.noteAPI.databaseBackup());
}

async function databaseBackupRestore(): Promise<Result<void>> {
  return invoke(window.noteAPI.databaseBackupRestore());
}

async function selectAutoExportFolder(): Promise<Result<string>> {
  return invoke(window.noteAPI.selectAutoExportFolder());
}

//----------------------------------------------------------

// settings api

async function getSettings<K extends keyof AppSettings>(
  key: K,
): Promise<Result<AppSettings[K]>> {
  return invoke(window.storeAPI.getSettings(key));
}

async function getAllSettings(): Promise<Result<AppSettings>> {
  return invoke(window.storeAPI.getAllSettings());
}

async function setSettings(
  settings: Partial<AppSettings>,
): Promise<Result<AppSettings>> {
  return invoke(window.storeAPI.setSettings(settings));
}

//----------------------------------------------------------

// electron api

async function setTheme(
  theme: Theme,
  focus?: boolean,
): Promise<Result<Exclude<Theme, "system">>> {
  return invoke(window.electronAPI.setTheme(theme, focus));
}

async function showNotification(
  title: string,
  body: string,
): Promise<Result<void>> {
  return invoke(window.electronAPI.showNotification(title, body));
}

async function imageWriteMany(
  payload: ImagePayload[],
): Promise<Result<{ imageSrc: string }[]>> {
  return invoke(window.electronAPI.imageWriteMany(payload));
}

async function handleZoom(action: ZoomAction): Promise<Result<ZoomAction>> {
  return invoke(window.electronAPI.zoom(action));
}

async function openExternal(url: string): Promise<Result<void>> {
  return invoke(window.electronAPI.openExternal(url));
}

async function openAutoExportFolder(
  payload: OpenAutoExportPathRequest,
): Promise<Result<boolean>> {
  return invoke(window.electronAPI.openAutoExportFolder(payload));
}

async function openInDefaultEditor(
  payload: OpenAutoExportPathRequest,
): Promise<Result<boolean>> {
  return invoke(window.electronAPI.openInDefaultEditor(payload));
}

async function openAppPath(): Promise<Result<boolean>> {
  return invoke(window.electronAPI.openAppPath());
}

async function getAutoExportPath(
  payload: OpenAutoExportPathRequest,
): Promise<Result<string | null>> {
  return invoke(window.electronAPI.getAutoExportPath(payload));
}

async function pinWindow(): Promise<Result<boolean>> {
  return invoke(window.electronAPI.windowPin());
}

//----------------------------------------------------------

// debounced calls

const debouncedSetSettings = debounce(
  async (settings: Partial<AppSettings>) => {
    try {
      const result = await setSettings(settings);
      if (!result.success) {
        console.error(
          "[setSettings]: Failed to update settings:",
          result.error,
        );
        return;
      }
    } catch (error: unknown) {
      console.error("[setSettings]: Unknown error", error);
    }
  },
  DEBOUNCE_MS.fast,
);

const updateSettings = (settings: Partial<AppSettings>) => {
  settingsStore.setState(settings);
  debouncedSetSettings(settings);
};

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
  getAutoExportPath,
  getManyById,
  getNoteById,
  getSettings,
  handleZoom,
  imageWriteMany,
  importNote,
  openAppPath,
  openAutoExportFolder,
  openExternal,
  openInDefaultEditor,
  pin,
  pinMany,
  pinWindow,
  selectAutoExportFolder,
  setTheme,
  showNotification,
  syncRequest,
  updateNote,
  updateSettings,
};

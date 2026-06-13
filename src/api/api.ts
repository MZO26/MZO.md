import { settingsStore } from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { DEBOUNCE_MS } from "@shared/constants";
import { AppErrorCode } from "@shared/errors";
import type {
  ExportRequest,
  ImportRequest,
  SyncRequest,
} from "@shared/schemas/export-schema";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type {
  CreateNotePayload,
  Note,
  NoteListItem,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import type {
  ExportedContent,
  ImageSrc,
  Result,
  SyncResult,
  View,
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

async function createNote(payload: CreateNotePayload): Promise<Result<Note>> {
  return invoke(window.noteAPI.create(payload));
}

async function createManyNotes(
  payload: CreateNotePayload[],
): Promise<Result<Note[]>> {
  return invoke(window.noteAPI.createMany(payload));
}

async function updateNote(
  note: UpdateNotePayload,
  flush: boolean,
): Promise<Result<Note>> {
  return invoke(window.noteAPI.update(note, flush));
}

async function deleteNote(id: string): Promise<Result<void>> {
  return invoke(window.noteAPI.delete(id));
}

async function getNoteById(id: string): Promise<Result<Note>> {
  return invoke(window.noteAPI.getById(id));
}

async function getManyById(ids: string[]): Promise<Result<Note[]>> {
  return invoke(window.noteAPI.getManyById(ids));
}

async function sync(payload: SyncRequest): Promise<Result<SyncResult>> {
  return invoke(window.noteAPI.sync(payload));
}

async function openMirrorFolder(): Promise<Result<string>> {
  return invoke(window.noteAPI.openMirrorFolder());
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

async function importNote(): Promise<Result<ImportRequest[]>> {
  return invoke(window.noteAPI.noteImport());
}

async function pin(id: string): Promise<Result<boolean>> {
  return invoke(window.noteAPI.pin(id));
}

async function bookmark(id: string): Promise<Result<boolean>> {
  return invoke(window.noteAPI.bookmark(id));
}

async function getViews(
  view: View,
  id: string | null,
): Promise<Result<Note[] | NoteListItem[]>> {
  return invoke(window.noteAPI.getViews(view, id));
}

async function dbMaintenance(action: string): Promise<Result<number>> {
  return invoke(window.noteAPI.dbMaintenance(action));
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

async function imageWrite(payload: ImagePayload): Promise<Result<ImageSrc>> {
  return invoke(window.electronAPI.imageWrite(payload));
}

async function handleZoom(action: ZoomAction): Promise<Result<ZoomAction>> {
  return invoke(window.electronAPI.zoom(action));
}

async function openExternal(url: string): Promise<Result<void>> {
  return invoke(window.electronAPI.openExternal(url));
}

async function openSyncPath(payload: SyncRequest): Promise<Result<void>> {
  return invoke(window.electronAPI.openSyncPath(payload));
}

async function openAppPath(): Promise<Result<void>> {
  return invoke(window.electronAPI.openAppPath());
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
    } catch (err) {
      console.error("[setSettings]: Unknown error", err);
    }
  },
  DEBOUNCE_MS.fast,
);

const updateSettings = (settings: Partial<AppSettings>) => {
  settingsStore.setState(settings);
  debouncedSetSettings(settings);
};

export {
  bookmark,
  createManyNotes,
  createNote,
  dbMaintenance,
  deleteNote,
  exportManyNotes,
  exportNote,
  getAll,
  getAllBackup,
  getAllSettings,
  getManyById,
  getNoteById,
  getSettings,
  getViews,
  handleZoom,
  imageWrite,
  importNote,
  openAppPath,
  openExternal,
  openMirrorFolder,
  openSyncPath,
  pin,
  pinWindow,
  setTheme,
  showNotification,
  sync,
  updateNote,
  updateSettings,
};

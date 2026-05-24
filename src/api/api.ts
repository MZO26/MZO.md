import { settingsStore } from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { AppErrorCode, DEBOUNCE_MS } from "@shared/constants";
import type {
  ExportRequest,
  ImportRequest,
} from "@shared/schemas/export-schema";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type {
  CreateNotePayload,
  Note,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { AppSettings, Theme } from "@shared/schemas/store-schema";
import type {
  ExportedContent,
  ImageSrc,
  Result,
  ZoomAction,
} from "@shared/types";

async function invoke<T>(ipcPromise: Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await ipcPromise;
  } catch (err: unknown) {
    console.error("[IPC Bridge Connection Error]: ", err);
    return { success: false, error: AppErrorCode.UnknownError };
  }
}

async function createNote(payload: CreateNotePayload): Promise<Result<Note>> {
  return invoke(window.noteAPI.create(payload));
}

async function createManyNotes(
  payload: CreateNotePayload[],
): Promise<Result<Note[]>> {
  return invoke(window.noteAPI.createMany(payload));
}

async function mergeNotes(idA: string, idB: string): Promise<Result<Note>> {
  return invoke(window.noteAPI.merge(idA, idB));
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

async function getAll(): Promise<Result<Note[]>> {
  return invoke(window.noteAPI.getAll());
}

async function getNoteById(id: string): Promise<Result<Note>> {
  return invoke(window.noteAPI.getById(id));
}

async function getManyById(ids: string[]): Promise<Result<Note[]>> {
  return invoke(window.noteAPI.getManyById(ids));
}

async function getByTag(tag: string): Promise<Result<Note[]>> {
  return invoke(window.noteAPI.getByTag(tag));
}

async function pin(id: string): Promise<Result<boolean>> {
  return invoke(window.noteAPI.pin(id));
}

async function bookmark(id: string): Promise<Result<boolean>> {
  return invoke(window.noteAPI.bookmark(id));
}

async function searchNotes(
  searchInput: string,
  limit: number,
): Promise<Result<Note[]>> {
  return invoke(window.noteAPI.searchNotes(searchInput, limit));
}

async function getViews(view: string): Promise<Result<Note[]>> {
  return invoke(window.noteAPI.getViews(view));
}

async function dbMaintenance(action: string): Promise<Result<number>> {
  return invoke(window.noteAPI.dbMaintenance(action));
}

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

const debouncedSetSettings = debounce(
  async (settings: Partial<AppSettings>) => {
    try {
      const result = await setSettings(settings);
      if (!result.success) {
        console.error("Failed to update settings:", result.error);
      }
    } catch (err) {
      console.error(err);
    }
  },
  DEBOUNCE_MS.slow,
);

const updateSettings = (settings: Partial<AppSettings>) => {
  settingsStore.setState(settings);
  debouncedSetSettings(settings);
};

async function exportNote(
  payload: ExportRequest,
): Promise<Result<ExportRequest>> {
  return invoke(window.fileAPI.noteExport(payload));
}

async function exportManyNotes(
  payload: ExportedContent[],
): Promise<Result<ExportedContent[]>> {
  return invoke(window.fileAPI.noteExportMany(payload));
}

async function importNote(): Promise<Result<ImportRequest[]>> {
  return invoke(window.fileAPI.noteImport());
}

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

async function saveImage(payload: ImagePayload): Promise<Result<ImageSrc>> {
  return invoke(window.fileAPI.saveImage(payload));
}

async function handleZoom(action: ZoomAction): Promise<Result<ZoomAction>> {
  return invoke(window.electronAPI.zoom(action));
}

export {
  bookmark,
  createManyNotes,
  createNote,
  dbMaintenance,
  deleteNote,
  exportManyNotes,
  exportNote,
  getAll,
  getAllSettings,
  getByTag,
  getManyById,
  getNoteById,
  getSettings,
  getViews,
  handleZoom,
  importNote,
  mergeNotes,
  pin,
  saveImage,
  searchNotes,
  setTheme,
  showNotification,
  updateNote,
  updateSettings,
};

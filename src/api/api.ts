import { settingsStore } from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { safeInvoke } from "@/utils/ipc";
import { showToast } from "@/utils/toast";
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
import type { ExportedContent, Result, ZoomAction } from "@shared/types";

async function createNote(payload: CreateNotePayload): Promise<Result<Note>> {
  return safeInvoke(window.noteAPI.create(payload));
}

async function createManyNotes(
  payload: CreateNotePayload[],
): Promise<Result<Note[]>> {
  return safeInvoke(window.noteAPI.createMany(payload));
}

async function mergeNotes(idA: string, idB: string): Promise<Result<Note>> {
  return safeInvoke(window.noteAPI.merge(idA, idB));
}

async function updateNote(
  note: UpdateNotePayload,
  flush: boolean,
): Promise<Result<Note>> {
  return safeInvoke(window.noteAPI.update(note, flush));
}

async function deleteNote(id: string): Promise<Result<void>> {
  return safeInvoke(window.noteAPI.delete(id));
}

async function getAll(): Promise<Result<Note[]>> {
  return safeInvoke(window.noteAPI.getAll());
}

async function getNoteById(id: string): Promise<Result<Note>> {
  return safeInvoke(window.noteAPI.getById(id));
}

async function getManyById(ids: string[]): Promise<Result<Note[]>> {
  return safeInvoke(window.noteAPI.getManyById(ids));
}

async function getByTag(tag: string): Promise<Result<Note[]>> {
  return safeInvoke(window.noteAPI.getByTag(tag));
}

async function pin(id: string): Promise<Result<boolean>> {
  return safeInvoke(window.noteAPI.pin(id));
}

async function bookmark(id: string): Promise<Result<boolean>> {
  return safeInvoke(window.noteAPI.bookmark(id));
}

async function searchNotes(
  searchInput: string,
  limit: number,
): Promise<Result<Note[]>> {
  return safeInvoke(window.noteAPI.searchNotes(searchInput, limit));
}

async function getViews(view: string): Promise<Result<Note[]>> {
  return safeInvoke(window.noteAPI.getViews(view));
}

async function dbMaintenance(action: string): Promise<Result<number>> {
  return safeInvoke(window.noteAPI.dbMaintenance(action));
}

async function getSettings<K extends keyof AppSettings>(
  key: K,
): Promise<Result<AppSettings[K]>> {
  return safeInvoke(window.storeAPI.getSettings(key));
}

async function getAllSettings(): Promise<Result<AppSettings>> {
  return safeInvoke(window.storeAPI.getAllSettings());
}

async function setSettings(
  settings: Partial<AppSettings>,
): Promise<Result<AppSettings>> {
  return safeInvoke(window.storeAPI.setSettings(settings));
}

const debouncedSetSettings = debounce(
  async (settings: Partial<AppSettings>) => {
    try {
      const response = await setSettings(settings);
      if (!response.success) {
        showToast(response.message);
      }
    } catch (err) {
      console.error(err);
    }
  },
  1000,
);

const updateSettings = (settings: Partial<AppSettings>) => {
  settingsStore.setState(settings);
  debouncedSetSettings(settings);
};

async function exportNote(
  payload: ExportRequest,
): Promise<Result<ExportRequest>> {
  return safeInvoke(window.fileAPI.noteExport(payload));
}

async function exportManyNotes(
  payload: ExportedContent[],
): Promise<Result<ExportedContent[]>> {
  return safeInvoke(window.fileAPI.noteExportMany(payload));
}

async function importNote(): Promise<Result<ImportRequest[]>> {
  return safeInvoke(window.fileAPI.noteImport());
}

async function setTheme(theme: Theme, focus?: boolean): Promise<Result<Theme>> {
  return safeInvoke(window.electronAPI.setTheme(theme, focus));
}

async function saveImage(
  payload: ImagePayload,
): Promise<Result<{ imageSrc: string }>> {
  return safeInvoke(window.electronAPI.saveImage(payload));
}

async function handleZoom(action: ZoomAction): Promise<Result<ZoomAction>> {
  return safeInvoke(window.electronAPI.zoom(action));
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
  updateNote,
  updateSettings,
};

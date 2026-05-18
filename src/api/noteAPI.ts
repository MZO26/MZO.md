import { safeInvoke } from "@/utils/ipc";
import type {
  CreateNotePayload,
  Note,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { Result } from "@shared/types";

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

export {
  bookmark,
  createManyNotes,
  createNote,
  dbMaintenance,
  deleteNote,
  getAll,
  getByTag,
  getManyById,
  getNoteById,
  getViews,
  mergeNotes,
  pin,
  searchNotes,
  updateNote,
};

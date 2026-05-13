import { safeInvoke } from "@/utils/ipc";
import type {
  CreateNotePayload,
  Note,
  UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { IpcResponse } from "@shared/types";

async function createNote(
  payload: CreateNotePayload,
): Promise<IpcResponse<Note>> {
  return safeInvoke(window.noteAPI.create(payload));
}

async function createManyNotes(
  payload: CreateNotePayload[],
): Promise<IpcResponse<Note[]>> {
  return safeInvoke(window.noteAPI.createMany(payload));
}

async function updateNote(
  note: UpdateNotePayload,
  flush: boolean,
): Promise<IpcResponse<Note>> {
  return safeInvoke(window.noteAPI.update(note, flush));
}

async function deleteNote(id: string): Promise<IpcResponse<void>> {
  return safeInvoke(window.noteAPI.delete(id));
}

async function getAll(): Promise<IpcResponse<Note[]>> {
  return safeInvoke(window.noteAPI.getAll());
}

async function getNoteById(id: string): Promise<IpcResponse<Note>> {
  return safeInvoke(window.noteAPI.getById(id));
}

async function getByTag(tag: string): Promise<IpcResponse<Note[]>> {
  return safeInvoke(window.noteAPI.getByTag(tag));
}

async function pin(id: string): Promise<IpcResponse<boolean>> {
  return safeInvoke(window.noteAPI.pin(id));
}

async function bookmark(id: string): Promise<IpcResponse<boolean>> {
  return safeInvoke(window.noteAPI.bookmark(id));
}

async function searchNotes(
  searchInput: string,
  limit: number,
): Promise<IpcResponse<Note[]>> {
  return safeInvoke(window.noteAPI.searchNotes(searchInput, limit));
}

async function getViews(view: string): Promise<IpcResponse<Note[]>> {
  return safeInvoke(window.noteAPI.getViews(view));
}

export {
  bookmark,
  createManyNotes,
  createNote,
  deleteNote,
  getAll,
  getByTag,
  getNoteById,
  getViews,
  pin,
  searchNotes,
  updateNote,
};

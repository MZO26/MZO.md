import type {
  CreateNotePayload,
  Note,
  UpdateNotePayload,
} from "../../../shared/schemas/noteSchema";
import type { IpcResponse } from "../../../shared/types";
import { safeIpcCall } from "../../utils/helpers";

async function createNote(
  payload: CreateNotePayload,
): Promise<IpcResponse<Note>> {
  return safeIpcCall(window.noteAPI.create(payload));
}

async function updateNote(
  note: UpdateNotePayload,
  flush: boolean,
): Promise<IpcResponse<Note>> {
  return safeIpcCall(window.noteAPI.update(note, flush));
}

async function deleteNote(id: string): Promise<IpcResponse<void>> {
  return safeIpcCall(window.noteAPI.delete(id));
}

async function getAll(): Promise<IpcResponse<Note[]>> {
  return safeIpcCall(window.noteAPI.getAll());
}

async function getNoteById(id: string): Promise<IpcResponse<Note>> {
  return safeIpcCall(window.noteAPI.getById(id));
}

async function getByTag(tag: string): Promise<IpcResponse<Note[]>> {
  return safeIpcCall(window.noteAPI.getByTag(tag));
}

async function pin(id: string): Promise<IpcResponse<boolean>> {
  return safeIpcCall(window.noteAPI.pin(id));
}

async function bookmark(id: string): Promise<IpcResponse<boolean>> {
  return safeIpcCall(window.noteAPI.bookmark(id));
}

export {
  bookmark,
  createNote,
  deleteNote,
  getAll,
  getByTag,
  getNoteById,
  pin,
  updateNote,
};

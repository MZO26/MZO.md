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

export { createNote, deleteNote, getAll, getNoteById, updateNote };

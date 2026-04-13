import type {
  CreateNotePayload,
  Note,
  Result,
  UpdateNotePayload,
} from "../../shared/types";
import { safeIpcCall } from "../../utils/helpers";

async function createNote(payload: CreateNotePayload): Promise<Result<Note>> {
  return safeIpcCall(window.noteAPI.create(payload));
}

async function updateNote(note: UpdateNotePayload): Promise<Result<Note>> {
  return safeIpcCall(window.noteAPI.update(note));
}

async function deleteNote(id: string): Promise<Result<boolean>> {
  return safeIpcCall(window.noteAPI.delete(id));
}

async function getAll(): Promise<Result<Note[]>> {
  return safeIpcCall(window.noteAPI.getAll());
}

async function getNoteById(id: string): Promise<Result<Note>> {
  return safeIpcCall(window.noteAPI.getById(id));
}

export { createNote, deleteNote, getAll, getNoteById, updateNote };

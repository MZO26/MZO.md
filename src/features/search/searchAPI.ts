import type { Note } from "../../../shared/schemas/noteSchema";
import type { IpcResponse } from "../../../shared/types";
import { safeIpcCall } from "../../utils/helpers";

async function searchNotes(
  searchInput: string,
  limit: number,
): Promise<IpcResponse<Note[]>> {
  return safeIpcCall(window.noteAPI.searchNotes(searchInput, limit));
}

async function getViews(view: string): Promise<IpcResponse<Note[]>> {
  return safeIpcCall(window.noteAPI.getViews(view));
}

export { getViews, searchNotes };

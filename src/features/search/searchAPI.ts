import type { Note, Result } from "../../../shared/types";
import { safeIpcCall } from "../../utils/helpers";

async function searchNotes(
  searchInput: string,
  limit: number,
): Promise<Result<Note[]>> {
  return safeIpcCall(window.noteAPI.searchNotes(searchInput, limit));
}

export { searchNotes };

import { createNote } from "@/api/api";
import { rendererLogger } from "@/app";
import { isAutoExportEnabled } from "@/notes/note-actions";
import { noteStore } from "@/state/state";
import { getAppItem } from "@/utils/registry";
import type { CreateNotePayload, Note } from "@shared/schemas/note-schema";

async function handleDuplicateNote(note: Readonly<Note>) {
  const editor = getAppItem("editor");
  const isAutoExport = isAutoExportEnabled();
  const {
    id: originalId,
    links: originalLinks,
    created_at,
    updated_at,
    ...rest
  } = note;
  // does not duplicate incoming links because other notes would be forced to point to this new duplicate
  const outgoingLinkIds = originalLinks
    .filter((link) => link.dir === "out")
    .map((link) => link.id);
  const markdown = isAutoExport
    ? editor.markdown?.serialize(note.content)
    : undefined;
  const data: CreateNotePayload = {
    ...rest,
    ...(isAutoExport && markdown !== undefined ? { markdown } : {}),
    links: outgoingLinkIds,
    pinned: false,
  };
  // not handleCreateNote because content is already there
  const result = await createNote(data);
  if (!result.success) {
    rendererLogger.appError(
      "[handleDuplicateNote]: Failed to create duplicate note:",
      result.error,
    );
    return;
  }
  noteStore.setState((state) => ({
    notes: [result.data, ...state.notes],
    visibleIds: [result.data.id, ...state.visibleIds],
    noteIndex: new Map(state.noteIndex).set(result.data.id, result.data),
  }));
}

export { handleDuplicateNote };

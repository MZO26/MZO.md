import { createNote } from "@/api/api";
import { getMarkdownManager } from "@/components/editor/editor-features";
import { isAutoExportEnabled } from "@/notes/note-actions";
import { noteStore, searchEngine } from "@/settings/app-state";
import { toNoteListItem } from "@/utils/note";
import type { CreateNotePayload, Note } from "@shared/schemas/note-schema";

async function handleDuplicateNote(note: Note) {
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
  let markdown: string | undefined;
  if (isAutoExportEnabled()) {
    markdown = getMarkdownManager().serialize(note.content);
  }
  const data: CreateNotePayload = {
    ...rest,
    ...(isAutoExportEnabled() && markdown !== undefined ? { markdown } : {}),
    links: outgoingLinkIds,
    pinned: false,
  };
  // not handleCreateNote because content is already there
  const result = await createNote(data);
  if (!result.success) {
    console.error(
      "[handleDuplicateNote]: Failed to create duplicate note:",
      result.error,
    );
    return;
  }
  const noteListItem = toNoteListItem(result.data);
  noteStore.setState((state) => ({
    notes: [noteListItem, ...state.notes],
    visibleIds: [noteListItem.id, ...state.visibleIds],
    noteIndex: new Map(state.noteIndex).set(noteListItem.id, noteListItem),
  }));
  searchEngine.upsertNote(noteListItem);
}

export { handleDuplicateNote };

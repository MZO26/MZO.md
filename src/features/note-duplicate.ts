import { createNote } from "@/api/api";
import { addOneNoteToList } from "@/components/sidebar/sidebar-actions";
import { noteStore } from "@/settings/app-state";
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
  const outgoingLinkIds: string[] = [];
  for (const link of originalLinks) {
    if (link.dir === "out") {
      outgoingLinkIds.push(link.id);
    }
  }
  const data: CreateNotePayload = {
    ...rest,
    links: outgoingLinkIds,
    pinned: false,
    bookmarked: false,
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
  noteStore.setState((state) => ({
    notes: [...state.notes, result.data],
  }));
  addOneNoteToList(result.data);
}

export { handleDuplicateNote };

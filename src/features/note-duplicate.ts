import { createNote } from "@/api/api";
import { addOneNoteToList } from "@/components/sidebar/sidebar-actions";
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
  const result = await createNote(data);
  if (!result.success) {
    console.error(
      "[handleDuplicateNote]: Failed to create duplicate note:",
      result.error,
    );
    return;
  }
  addOneNoteToList(result.data);
}

export { handleDuplicateNote };

import { createNote } from "@/api/api";
import { resetEditorHistory } from "@/components/editor/editor-features";
import { handleSyncWrite, isSyncEnabled } from "@/notes/note-sync";
import { noteStore, stateStore } from "@/settings/app-state";
import { getAppItem } from "@/utils/registry";
import type { CreateNotePayload, Note } from "@shared/schemas/note-schema";

async function handleDuplicateNote(note: Note) {
  const editor = getAppItem("editor");
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
    notes: [result.data, ...state.notes],
    sidebarChange: { type: "prepend", noteId: result.data.id },
  }));
  stateStore.setState({ activeId: result.data.id });
  editor.commands.setContent(result.data.content, {
    emitUpdate: false,
  });
  resetEditorHistory(editor);
  requestAnimationFrame(() => {
    editor.commands.focus();
  });
  if (isSyncEnabled())
    handleSyncWrite(result.data.id, result.data.markdown, result.data.title);
}

export { handleDuplicateNote };

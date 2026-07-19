import { createNote } from "@/api/api";
import { getCachedEditorExtensions } from "@/components/editor/editor-features";
import { resetEditorHistory } from "@/components/editor/editor-init";
import { isAutoExportEnabled } from "@/notes/note-actions";
import {
  markNoteAsRecent,
  noteStore,
  searchEngine,
  stateStore,
} from "@/settings/app-state";
import { toNoteListItem } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import type { CreateNotePayload, Note } from "@shared/schemas/note-schema";
import { Editor } from "@tiptap/core";

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
  const outgoingLinkIds = originalLinks
    .filter((link) => link.dir === "out")
    .map((link) => link.id);

  let markdown: string | undefined;
  if (isAutoExportEnabled()) {
    const headlessEditor = new Editor({
      extensions: getCachedEditorExtensions(),
      content: note.content,
    });
    try {
      markdown = headlessEditor.getMarkdown();
    } catch (error) {
      console.error(
        "[handleDuplicateNote]: Markdown conversion failed:",
        error,
      );
    } finally {
      if (headlessEditor) headlessEditor.destroy();
    }
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
    activeNote: result.data,
    notes: [noteListItem, ...state.notes],
    visibleIds: [noteListItem.id, ...state.visibleIds],
    noteIndex: new Map(state.noteIndex).set(noteListItem.id, noteListItem),
    sidebarChange: { type: "add", noteId: result.data.id },
  }));
  searchEngine.upsertNote(noteListItem);
  stateStore.setState({ activeId: result.data.id });
  editor.commands.setContent(result.data.content, {
    emitUpdate: false,
  });
  resetEditorHistory(editor);
  editor.commands.focus();
  markNoteAsRecent(result.data.id);
}

export { handleDuplicateNote };

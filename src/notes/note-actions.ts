import {
  createManyNotes,
  createNote,
  deleteNote,
  getNoteById,
  importNote,
  showNotification,
  updateNote,
} from "@/api/api";
import { resetEditorHistory } from "@/components/editor/editor-features";
import { debouncedUpdateStats } from "@/components/sidebar/sidebar-features";
import { setImportedContent } from "@/notes/import-actions";
import {
  handleSync,
  handleSyncDelete,
  handleSyncWrite,
  isSyncEnabled,
} from "@/notes/note-sync";
import { noteStore, stateStore } from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { findElement, setActiveItem } from "@/utils/dom";
import { resolveTitle } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import { DEBOUNCE_MS, UNTITLED } from "@shared/constants";
import { getMetadata, titleGenerator } from "@shared/generators";
import type { EditorDoc } from "@shared/schemas/editor-schema";
import {
  type CreateNotePayload,
  type UpdateNotePayload,
} from "@shared/schemas/note-schema";

// note crud operations + import

//------------------------------------------------------------

// create

async function handleCreateNote() {
  const editor = getAppItem("editor");
  const editorContent = {
    content: { type: "doc" as const, content: [{ type: "paragraph" }] },
    plainText: "",
    markdown: "",
  };
  const metadata = getMetadata(editorContent.content, editorContent.plainText);
  const payload: CreateNotePayload = {
    ...editorContent,
    ...metadata,
    title: UNTITLED,
    pinned: false,
    bookmarked: false,
  };
  const result = await createNote(payload);
  if (!result.success) {
    console.error("[handleCreateNote]: Failed to create note:", result.error);
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
    await handleSyncWrite(result.data.id, result.data.markdown, UNTITLED);
}

//------------------------------------------------------------

// import + create many

async function handleImportNote() {
  const imported = await importNote();
  if (!imported.success) return;
  const processedPayloads = await setImportedContent(imported.data);
  if (!processedPayloads.success) return;
  const result = await createManyNotes(processedPayloads.data);
  if (!result.success) {
    console.error(
      "[handleImportNote]: Failed to create imported notes:",
      result.error,
    );
    return;
  }
  const count = imported.data.length;
  await showNotification(
    "Import Successful.",
    `Successfully imported ${count} file${count === 1 ? "" : "s"}`,
  );
  noteStore.setState((state) => ({
    notes: [...result.data, ...state.notes],
    sidebarChange: { type: "reload" },
  }));
}

//----------------------------------------------------------

// delete

async function handleDeleteNote(id: string) {
  const editor = getAppItem("editor");
  const { notes } = noteStore.getState();
  const noteToDelete = notes.find((n) => n.id === id);
  const { activeId } = stateStore.getState();
  const isActiveDeletedId = activeId === id;
  if (isActiveDeletedId) {
    debouncedSaveNote.cancel();
  }
  const result = await deleteNote(id);
  if (!result.success) {
    console.error("[handleDeleteNote]: Failed to delete:", result.error);
    return;
  }
  noteStore.setState((state) => ({
    notes: state.notes.filter((note) => note.id !== id),
    sidebarChange: { type: "remove", noteId: id },
  }));
  if (isActiveDeletedId) {
    stateStore.setState({ activeId: null });
    editor.commands.clearContent();
  }
  if (isSyncEnabled() && noteToDelete) {
    const deleteRequestPayload = {
      id: noteToDelete.id,
      extension: "md" as const,
      fileName: noteToDelete.title,
    };
    await handleSyncDelete(deleteRequestPayload);
  }
}

//------------------------------------------------------------

// update

async function handleSaveNote(
  id: string,
  editorContent: {
    content: EditorDoc;
    plainText: string;
    markdown: string;
  },
  flush: boolean = false,
) {
  const metaData = getMetadata(editorContent.content, editorContent.plainText);
  const oldNote = noteStore.getState().notes.find((n) => n.id === id);
  if (oldNote?.markdown === editorContent.markdown) return; // if content is the same, do not proceed with save. prevents resetting of editor history and unnecessary writes
  const previousTitle = oldNote?.title ?? "";
  let newTitle = previousTitle;
  if (!flush) {
    newTitle = resolveTitle(previousTitle, editorContent.plainText);
  } else newTitle = titleGenerator(editorContent.plainText);
  const payload: UpdateNotePayload = {
    id,
    title: newTitle,
    ...editorContent,
    ...metaData,
  };
  const result = await updateNote(payload, flush);
  if (!result.success) {
    console.error("[handleSaveNote]: save failed", result.error);
    return;
  }
  noteStore.setState((state) => ({
    notes: state.notes.map((n) => (n.id === result.data.id ? result.data : n)),
    sidebarChange: { type: "update", noteId: result.data.id },
  }));
  debouncedUpdateStats(result.data);
  if (isSyncEnabled())
    await handleSyncWrite(
      result.data.id,
      result.data.markdown,
      newTitle,
      previousTitle,
    );
}

const debouncedSaveNote = debounce(handleSaveNote, DEBOUNCE_MS.slow);

//------------------------------------------------------------

// read or getById

async function handleSelectNote(id: string) {
  const sidebar = getAppItem("sidebar");
  const editor = getAppItem("editor");
  debouncedSaveNote.flush();
  debouncedUpdateStats.flush();
  stateStore.setState({ activeId: id });
  const result = await getNoteById(id);
  if (!result.success) {
    console.error("[handleSelectNote]: Failed to fetch note:", result.error);
    return;
  }
  if (isSyncEnabled()) {
    await handleSync(id, result.data.updated_at).catch((error) =>
      console.error(
        "[handleSelectNote]: Error while trying to sync note",
        error,
      ),
    );
  }
  const noteElement = findElement<HTMLDivElement>(
    `.note-item[data-id="${id}"]`,
    sidebar,
  );
  if (!noteElement) return;
  editor.commands.setContent(result.data.content, {
    emitUpdate: false,
  });
  resetEditorHistory(editor);
  requestAnimationFrame(() => {
    editor.commands.focus();
  });
  setActiveItem(noteElement, sidebar);
}

//------------------------------------------------------------

export {
  debouncedSaveNote,
  handleCreateNote,
  handleDeleteNote,
  handleImportNote,
  handleSaveNote,
  handleSelectNote,
};

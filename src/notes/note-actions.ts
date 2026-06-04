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
import { updateStats } from "@/components/sidebar/sidebar-features";
import { setImportedContent } from "@/notes/import-actions";
import { handleConflict, isMirrorEnabled } from "@/notes/note-conflict";
import { noteStore, stateStore } from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { findElement, setActiveItem } from "@/utils/dom";
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
  const metadata = getMetadata(editorContent.content);
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
  const metaData = getMetadata(editorContent.content);
  const oldNote = noteStore.getState().notes.find((n) => n.id === id);
  if (oldNote?.markdown === editorContent.markdown) return; // if content is the same, do not proceed with save. prevents resetting of editor history and unnecessary writes
  const newTitle = titleGenerator(editorContent.content);
  const payload: UpdateNotePayload = {
    id,
    title: newTitle,
    ...editorContent,
    ...metaData,
  };
  const result = await updateNote(payload, flush);
  if (!result.success) {
    console.error("[handleSaveNote]: Save failed.", result.error);
    return;
  }
  noteStore.setState((state) => ({
    notes: state.notes.map((n) => (n.id === result.data.id ? result.data : n)),
    sidebarChange: { type: "update", noteId: result.data.id },
  }));
  await updateStats(result.data);
}

const debouncedSaveNote = debounce(handleSaveNote, DEBOUNCE_MS.slow);

//------------------------------------------------------------

// read or getById

async function handleSelectNote(id: string) {
  const sidebar = getAppItem("sidebar");
  const editor = getAppItem("editor");
  debouncedSaveNote.flush();
  stateStore.setState({ activeId: id });
  const result = await getNoteById(id);
  if (stateStore.getState().activeId !== id) return;
  if (!result.success) {
    console.error("[handleSelectNote]: Failed to fetch note:", result.error);
    return;
  }
  if (isMirrorEnabled()) {
    await handleConflict(id, result.data.updated_at).catch((error) =>
      console.error(
        "[handleSelectNote -> handleConflict]: Error while trying to sync note",
        error,
      ),
    );
    if (stateStore.getState().activeId !== id) return;
  }
  const noteElement = findElement<HTMLDivElement>(
    `.note-item[data-id="${id}"]`,
    sidebar,
  );
  editor.commands.setContent(result.data.content, {
    emitUpdate: false,
  });
  resetEditorHistory(editor);
  requestAnimationFrame(() => {
    editor.commands.focus();
  });
  if (noteElement) setActiveItem(noteElement, sidebar);
  await updateStats(result.data);
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

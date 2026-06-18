import {
  createManyNotes,
  createNote,
  deleteNote,
  getNoteById,
  importNote,
  showNotification,
  updateNote,
} from "@/api/api";
import { resetEditorHistory, updateToc } from "@/components/editor/editor-init";
import { updateStats } from "@/components/sidebar/sidebar-features";
import { getTableOfContents } from "@/extensions/tableOfContents";
import { setImportedContent } from "@/notes/import-actions";
import {
  noteStore,
  searchEngine,
  settingsStore,
  stateStore,
} from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { toNoteListItem } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import { DEBOUNCE_MS, EMPTY_DOC, UNTITLED } from "@shared/constants";
import { getMetadata, titleGenerator } from "@shared/generators";
import {
  type CreateNotePayload,
  type Note,
  type UpdateNotePayload,
} from "@shared/schemas/note-schema";

// helpers

function isAutoExportEnabled() {
  return settingsStore.get("auto-export") ?? false;
}

//----------------------------------------------------------

// note crud operations + import

// create

async function handleCreateNote() {
  const editor = getAppItem("editor");
  const editorContent = EMPTY_DOC;
  const metadata = getMetadata(editorContent);
  const payload: CreateNotePayload = {
    content: editorContent,
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
  const noteListItem = toNoteListItem(result.data);
  noteStore.setState((state) => ({
    activeNote: result.data,
    notes: [noteListItem, ...state.notes],
    visibleIds: [noteListItem.id, ...state.visibleIds],
    noteIndex: new Map(state.noteIndex).set(noteListItem.id, noteListItem),
    sidebarChange: { type: "prepend", noteId: result.data.id },
  }));
  searchEngine.upsertNote(noteListItem);
  stateStore.setState({ activeId: result.data.id });
  editor.commands.setContent(result.data.content, {
    emitUpdate: false,
  });
  resetEditorHistory(editor);
  requestAnimationFrame(() => {
    editor.commands.focus();
  });
  updateStats();
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
  const notes = new Array(result.data.length);
  let i = 0;
  for (const note of result.data) {
    const noteListItem = toNoteListItem(note);
    notes[i] = noteListItem;
    i++;
  }
  noteStore.setState((state) => ({
    notes: [...notes, ...state.notes],
    visibleIds: [...notes.map((n) => n.id), ...state.visibleIds],
    noteIndex: new Map([
      ...state.noteIndex,
      ...notes.map((n) => [n.id, n] as const),
    ]),
    sidebarChange: { type: "reload" },
  }));
  searchEngine.addMany(notes);
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
  noteStore.setState((state) => {
    const noteIndex = new Map(state.noteIndex);
    noteIndex.delete(id);
    return {
      activeNote: state.activeNote?.id === id ? null : state.activeNote,
      notes: state.notes.filter((note) => note.id !== id),
      visibleIds: state.visibleIds.filter((noteId) => noteId !== id),
      noteIndex,
      sidebarChange: { type: "remove", noteId: id },
    };
  });
  searchEngine.removeNote(id);
  if (isActiveDeletedId) {
    stateStore.setState({ activeId: null });
    editor.commands.clearContent();
  }
}

//------------------------------------------------------------

// update

async function handleSaveNote(
  id: string,
  content: Note["content"],
  markdown?: string,
  flush: boolean = false,
) {
  const metaData = getMetadata(content);
  const newTitle = titleGenerator(content);
  const autoExportEnabled = isAutoExportEnabled();
  const payload: UpdateNotePayload = {
    id,
    title: newTitle,
    content,
    ...metaData,
    ...(autoExportEnabled && markdown !== undefined ? { markdown } : {}),
  };
  const result = await updateNote(payload, flush);
  if (!result.success) {
    console.error("[handleSaveNote]: Save failed.", result.error);
    return;
  }
  const note = result.data;
  const updatedListItem = toNoteListItem(note);
  noteStore.setState((state) => {
    const noteIndex = new Map(state.noteIndex);
    noteIndex.set(updatedListItem.id, updatedListItem);
    return {
      activeNote: state.activeNote?.id === note.id ? note : state.activeNote,
      notes: state.notes.map((n) =>
        n.id === updatedListItem.id ? updatedListItem : n,
      ),
      noteIndex,
      sidebarChange: { type: "update", noteId: note.id },
    };
  });
  searchEngine.upsertNote(updatedListItem);
  updateStats();
}

const debouncedSaveNote = debounce(handleSaveNote, DEBOUNCE_MS.slow);

//------------------------------------------------------------

// read or getById

async function handleSelectNote(id: string) {
  const editor = getAppItem("editor");
  debouncedSaveNote.flush();
  stateStore.setState({ activeId: id });
  noteStore.setState({ activeNote: null });
  const result = await getNoteById(id);
  if (stateStore.getState().activeId !== id) return;
  if (!result.success) {
    console.error("[handleSelectNote]: Failed to fetch note:", result.error);
    return;
  }
  const note = result.data;
  editor.commands.setContent(note.content, {
    emitUpdate: false,
  });
  noteStore.setState({ activeNote: note });
  resetEditorHistory(editor);
  requestAnimationFrame(() => {
    editor.commands.focus();
  });
  const headings = getTableOfContents(editor);
  updateToc(headings);
  updateStats();
}

//------------------------------------------------------------

export {
  debouncedSaveNote,
  handleCreateNote,
  handleDeleteNote,
  handleImportNote,
  handleSaveNote,
  handleSelectNote,
  isAutoExportEnabled,
};

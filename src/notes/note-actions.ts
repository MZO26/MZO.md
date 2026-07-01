import {
  createManyNotes,
  createNote,
  deleteManyNotes,
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
import { addActiveTagToDoc, toNoteListItem } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import { DEBOUNCE_MS, EMPTY_DOC, UNTITLED } from "@shared/constants";
import { getMetadata, titleGenerator } from "@shared/generators";
import {
  type CreateNotePayload,
  type Note,
  type NoteListItem,
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
  const activeTag = stateStore.get("activeTag");
  const editorContent = addActiveTagToDoc(EMPTY_DOC, activeTag);
  const metadata = getMetadata(editorContent);
  const payload: CreateNotePayload = {
    content: editorContent,
    plainText: "",
    ...metadata,
    title: UNTITLED,
    pinned: false,
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
    sidebarChange: { type: "add", noteId: result.data.id },
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
  const headings = getTableOfContents(editor);
  updateToc(headings);
  updateStats();
}

//------------------------------------------------------------

// import + create many

async function handleImportNote() {
  const imported = await importNote();
  if (!imported.success) {
    console.error(
      "[handleImportNote -> importNote]: Failed to import note:",
      imported.error,
    );
    return;
  }
  const processedPayloads = await setImportedContent(imported.data);
  if (!processedPayloads.success) {
    console.error(
      "[handleImportNote -> setImportedContent]: Failed to process import payload:",
      processedPayloads.error,
    );
    return;
  }
  const result = await createManyNotes(processedPayloads.data);
  if (!result.success) {
    console.error(
      "[handleImportNote]: Failed to create imported notes:",
      result.error,
    );
    return;
  }
  await showNotification(
    "Import Successful.",
    `Successfully imported ${result.data.length} file${result.data.length === 1 ? "" : "s"}`,
  );
  const notes: NoteListItem[] = [];
  for (const note of result.data) {
    const noteListItem = toNoteListItem(note);
    notes.push(noteListItem);
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

async function handleDeleteManyNotes(ids: string[]) {
  const activeId = stateStore.get("activeId");
  const deletedIds = new Set(ids);
  const isActiveDeleted = activeId !== null && deletedIds.has(activeId);
  if (isActiveDeleted) {
    debouncedSaveNote.cancel();
  }
  const result = await deleteManyNotes(ids);
  if (!result.success) {
    console.error("[handleDeleteManyNotes]: Failed to delete:", result.error);
    return;
  }
  noteStore.setState((state) => {
    const noteIndex = new Map(state.noteIndex);
    for (const id of deletedIds) {
      noteIndex.delete(id);
    }
    return {
      activeNote:
        state.activeNote && deletedIds.has(state.activeNote.id)
          ? null
          : state.activeNote,
      notes: state.notes.filter((note) => !deletedIds.has(note.id)),
      visibleIds: state.visibleIds.filter((noteId) => !deletedIds.has(noteId)),
      noteIndex,
      sidebarChange: { type: "reload" },
    };
  });
  searchEngine.removeMany([...deletedIds]);
  if (isActiveDeleted) {
    stateStore.setState({ activeId: null });
  }
}

async function handleDeleteNote(id: string) {
  const activeId = stateStore.get("activeId");
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
  }
}

//---------------------------------------------------------

// update

async function handleSaveNote(
  id: string,
  content: Note["content"],
  plainText: Note["plainText"],
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
    plainText,
    ...metaData,
    ...(autoExportEnabled && markdown !== undefined ? { markdown } : {}),
  };
  const result = await updateNote(payload, flush);
  if (!result.success) {
    console.error("[handleSaveNote]: Save failed.", result.error);
    return;
  }
  const updatedListItem = toNoteListItem(result.data);
  const activeTag = stateStore.get("activeTag");
  noteStore.setState((state) => {
    const noteIndex = new Map(state.noteIndex);
    noteIndex.set(updatedListItem.id, updatedListItem);
    const matchesTag = activeTag
      ? updatedListItem.tags.includes(activeTag)
      : true;
    const alreadyVisible = state.visibleIds.includes(updatedListItem.id);
    let visibleIds = state.visibleIds;
    let needsReload = false;
    if (alreadyVisible && !matchesTag) {
      visibleIds = state.visibleIds.filter((id) => id !== updatedListItem.id);
      needsReload = true;
    } else if (!alreadyVisible && matchesTag) {
      visibleIds = [updatedListItem.id, ...state.visibleIds];
      needsReload = true;
    }
    return {
      activeNote:
        state.activeNote?.id === result.data.id
          ? result.data
          : state.activeNote,
      notes: state.notes.map((n) =>
        n.id === updatedListItem.id ? updatedListItem : n,
      ),
      visibleIds,
      noteIndex,
      sidebarChange: {
        type: needsReload ? "reload" : "update",
        noteId: result.data.id,
      },
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
  editor.commands.setContent(result.data.content, {
    emitUpdate: false,
  });
  noteStore.setState({ activeNote: result.data });
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
  handleDeleteManyNotes,
  handleDeleteNote,
  handleImportNote,
  handleSaveNote,
  handleSelectNote,
  isAutoExportEnabled,
};

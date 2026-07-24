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
import { updateToc } from "@/components/editor/editor-init";
import { updateStats } from "@/components/sidebar/sidebar-features";
import { getTableOfContents } from "@/extensions/toc";
import { setImportedContent } from "@/notes/import-actions";
import {
  markNoteAsRecent,
  matchesActiveTag,
  noteStore,
  pruneRecentNotes,
  removeRecentNote,
  searchEngine,
  settingsStore,
  stateStore,
} from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { addActiveTagToDoc, checkNoteSize } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import { DEBOUNCE_MS, EMPTY_DOC, UNTITLED } from "@shared/constants";
import { getMetadata, titleGenerator } from "@shared/generators";
import {
  type CreateNotePayload,
  type UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { FilePathRequest } from "@shared/schemas/request-schema";
import { EditorState } from "@tiptap/pm/state";

// helpers

function isAutoExportEnabled() {
  return settingsStore.get("auto_export") ?? false;
}

//----------------------------------------------------------

// create

async function handleCreateNote() {
  const editor = getAppItem("editor");
  const activeTag = stateStore.get("activeTag");
  const editorContent = addActiveTagToDoc(EMPTY_DOC, activeTag);
  const metadata = getMetadata(editorContent);
  const payload: CreateNotePayload = {
    content: editorContent,
    ...metadata,
    title: UNTITLED,
    pinned: false,
  };
  const result = await createNote(payload);
  if (!result.success) {
    console.error("[handleCreateNote]: Failed to create note:", result.error);
    return;
  }
  noteStore.setState((state) => ({
    notes: [result.data, ...state.notes],
    visibleIds: [result.data.id, ...state.visibleIds],
    noteIndex: new Map(state.noteIndex).set(result.data.id, result.data),
  }));
  searchEngine.upsertNote(result.data);
  stateStore.setState({ activeId: result.data.id });
  const newDoc = editor.schema.nodeFromJSON(editorContent);
  const newState = EditorState.create({
    schema: editor.schema,
    doc: newDoc,
    plugins: editor.extensionManager.plugins,
  });
  editor.view.updateState(newState);
  editor.commands.focus();
  const headings = getTableOfContents(editor);
  updateToc(headings);
  updateStats();
  markNoteAsRecent(result.data.id);
}

//------------------------------------------------------------

// import + create many

async function handleImportNote(request: FilePathRequest) {
  const imported = await importNote(
    request.source === "dialog"
      ? request
      : { source: "external", filePaths: request.filePaths },
  );
  if (!imported.success) {
    console.error(
      "[handleImportNote -> importNote]: Failed to import note:",
      imported.error,
    );
    return;
  }
  const processedPayloads = await setImportedContent(imported.data.data);
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
  const { duplicates, errors } = imported.data.stats;
  const successCount = result.data.length;
  await showNotification(
    "Import Complete",
    `Imported ${successCount} file${successCount === 1 ? "" : "s"}.\n` +
      `Duplicates skipped: ${duplicates}\n` +
      `Errors: ${errors}`,
  );
  noteStore.setState((state) => ({
    notes: [...result.data, ...state.notes],
    visibleIds: [...result.data.map((n) => n.id), ...state.visibleIds],
    noteIndex: new Map([
      ...state.noteIndex,
      ...result.data.map((n) => [n.id, n] as const),
    ]),
  }));
  searchEngine.addMany(result.data);
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
      notes: state.notes.filter((note) => !deletedIds.has(note.id)),
      visibleIds: state.visibleIds.filter((noteId) => !deletedIds.has(noteId)),
      noteIndex,
    };
  });
  searchEngine.removeMany([...deletedIds]);
  if (isActiveDeleted) {
    stateStore.setState({ activeId: null });
  }
  pruneRecentNotes();
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
      notes: state.notes.filter((note) => note.id !== id),
      visibleIds: state.visibleIds.filter((noteId) => noteId !== id),
      noteIndex,
    };
  });
  searchEngine.removeNote(id);
  if (isActiveDeletedId) {
    stateStore.setState({ activeId: null });
  }
  removeRecentNote(id);
}

//---------------------------------------------------------

// update

async function handleSaveNote(id: string, flush: boolean = false) {
  const activeId = stateStore.get("activeId");
  if (activeId !== id) return;
  const activeNote = noteStore.get("noteIndex").get(activeId);
  if (!activeNote) return;
  const autoExportEnabled = isAutoExportEnabled();
  const editor = getAppItem("editor");
  const content = editor.getJSON();
  const markdown = autoExportEnabled ? editor.getMarkdown() : undefined;
  const metaData = getMetadata(content);
  const newTitle = titleGenerator(content);
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
  const isActiveNote = stateStore.get("activeId") === id;
  const activeTag = stateStore.get("activeTag");
  noteStore.setState((state) => {
    const noteIndex = new Map(state.noteIndex);
    noteIndex.set(result.data.id, result.data);
    const matchesTag = matchesActiveTag(result.data, activeTag);
    const alreadyVisible = state.visibleIds.includes(result.data.id);
    let visibleIds = state.visibleIds;
    if (alreadyVisible && !matchesTag) {
      visibleIds = state.visibleIds.filter((vid) => vid !== result.data.id);
    } else if (!alreadyVisible && matchesTag) {
      visibleIds = [result.data.id, ...state.visibleIds];
    }
    return {
      notes: state.notes.map((n) =>
        n.id === result.data.id ? result.data : n,
      ),
      visibleIds,
      noteIndex,
    };
  });
  searchEngine.upsertNote(result.data);
  if (isActiveNote) {
    updateStats();
    const currentHeadings = getTableOfContents(editor);
    updateToc(currentHeadings);
  }
}

const debouncedSaveNote = debounce(handleSaveNote, DEBOUNCE_MS.slow);

//------------------------------------------------------------

// getById

async function handleSelectNote(id: string) {
  const editor = getAppItem("editor");
  const activeId = stateStore.get("activeId");
  debouncedSaveNote.flush();
  if (activeId === id) {
    console.log("Already active. Skipping select.");
    return;
  }
  stateStore.setState({ activeId: id });
  editor.setEditable(false, false);
  const result = await getNoteById(id);
  if (stateStore.get("activeId") !== id) return;
  if (!result.success) {
    console.error("[handleSelectNote]: Failed to fetch note:", result.error);
    return;
  }
  try {
    await checkNoteSize(result.data.content);
    const newDoc = editor.schema.nodeFromJSON(result.data.content);
    const newState = EditorState.create({
      schema: editor.schema,
      doc: newDoc,
      plugins: editor.extensionManager.plugins,
    });
    editor.view.updateState(newState);
  } catch (error) {
    console.error("Invalid Editor content:", error);
    editor.setEditable(false, false);
    updateToc([]);
    updateStats();
    await showNotification("Invalid content detected", "Couldn't load content");
    return;
  }
  if (stateStore.getState().activeId !== id) return;
  const headings = getTableOfContents(editor);
  updateToc(headings);
  updateStats();
  editor.setEditable(true, false);
  markNoteAsRecent(id);
  editor.commands.focus();
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

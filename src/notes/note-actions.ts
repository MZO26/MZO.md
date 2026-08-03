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
import { rendererLogger } from "@/app";
import { recreateEditorState } from "@/components/editor/editor-actions";
import { updateToc } from "@/components/editor/editor-init";
import { updateStats } from "@/components/editor/editor-ui";
import {
  markNoteAsRecent,
  pruneRecentNotes,
  removeRecentNote,
} from "@/components/quick-switch/quick-switch-actions";
import { matchesActiveTag } from "@/components/sidebar/sidebar-views";
import { getTableOfContents } from "@/extensions/toc";
import { setImportedContent } from "@/notes/import-actions";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { debounce } from "@/utils/async";
import { getMetadata, titleGenerator } from "@/utils/generators";
import { addActiveTagToDoc, checkNoteSize } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import { DEBOUNCE_MS, EMPTY_DOC, UNTITLED } from "@shared/constants";
import {
  type CreateNotePayload,
  type Note,
  type UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { FilePathRequest } from "@shared/schemas/request-schema";

function isAutoExportEnabled() {
  return settingsStore.get("auto_export") ?? false;
}

async function handleCreateNote() {
  const editor = getAppItem("editor");
  const activeTag = stateStore.get("activeTag");
  const editorContent = addActiveTagToDoc(EMPTY_DOC, activeTag);
  const text = editor.getText();
  const metadata = getMetadata(editorContent);
  const payload: CreateNotePayload = {
    content: editorContent,
    plain_text: text,
    ...metadata,
    title: UNTITLED,
    pinned: false,
  };
  const result = await createNote(payload);
  if (!result.success) {
    rendererLogger.appError(
      "[handleCreateNote]: Failed to create note:",
      result.error,
    );
    return;
  }
  noteStore.setState((state) => ({
    notes: [result.data, ...state.notes],
    visibleIds: [result.data.id, ...state.visibleIds],
    noteIndex: new Map(state.noteIndex).set(result.data.id, result.data),
  }));
  stateStore.setState({ activeId: result.data.id });
  recreateEditorState(editor, editorContent);
  editor.commands.focus();
  const headings = getTableOfContents(editor);
  updateToc(headings);
  updateStats();
  markNoteAsRecent(result.data.id);
}

async function handleImportNote(request: FilePathRequest) {
  const imported = await importNote(
    request.source === "dialog"
      ? request
      : { source: "external", filePaths: request.filePaths },
  );
  if (!imported.success) {
    rendererLogger.appError(
      "[handleImportNote -> importNote]: Failed to import note:",
      imported.error,
    );
    return;
  }
  const processedPayloads = await setImportedContent(imported.data.data);
  if (!processedPayloads.success) {
    rendererLogger.appError(
      "[handleImportNote -> setImportedContent]: Failed to process import payload:",
      processedPayloads.error,
    );
    return;
  }
  const result = await createManyNotes(processedPayloads.data);
  if (!result.success) {
    rendererLogger.appError(
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
}

async function handleDeleteManyNotes(ids: string[]) {
  const activeId = stateStore.get("activeId");
  const deletedIds = new Set(ids);
  const isActiveDeleted = activeId !== null && deletedIds.has(activeId);
  if (isActiveDeleted) {
    debouncedSaveNote.cancel();
  }
  const result = await deleteManyNotes(ids);
  if (!result.success) {
    rendererLogger.appError(
      "[handleDeleteManyNotes]: Failed to delete:",
      result.error,
    );
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
    rendererLogger.appError(
      "[handleDeleteNote]: Failed to delete:",
      result.error,
    );
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
  if (isActiveDeletedId) {
    stateStore.setState({ activeId: null });
  }
  removeRecentNote(id);
}

async function handleSaveNote(id: string, flush: boolean = false) {
  const activeId = stateStore.get("activeId");
  if (activeId !== id) return;
  const activeNote = noteStore.get("noteIndex").get(activeId);
  if (!activeNote) return;
  const autoExportEnabled = isAutoExportEnabled();
  const editor = getAppItem("editor");
  const content = editor.getJSON();
  const text = editor.getText();
  const markdown = autoExportEnabled ? editor.getMarkdown() : undefined;
  const metaData = getMetadata(content);
  const newTitle = titleGenerator(content);
  const payload: UpdateNotePayload = {
    id,
    title: newTitle,
    content,
    plain_text: text,
    ...metaData,
    ...(autoExportEnabled && markdown !== undefined ? { markdown } : {}),
  };
  const result = await updateNote(payload, flush);
  if (!result.success) {
    rendererLogger.appError("[handleSaveNote]: Save failed.", result.error);
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
    const notes = state.notes.map((n) =>
      n.id === result.data.id ? result.data : n,
    );
    return {
      notes,
      visibleIds,
      noteIndex,
    };
  });
  if (isActiveNote) {
    updateStats();
    const currentHeadings = getTableOfContents(editor);
    updateToc(currentHeadings);
  }
}

const debouncedSaveNote = debounce(handleSaveNote, DEBOUNCE_MS.slow);

async function handleSelectNote(id: string) {
  const editor = getAppItem("editor");
  const activeId = stateStore.get("activeId");
  debouncedSaveNote.flush();
  if (activeId === id) {
    rendererLogger.devLog("Already active. Skipping select.");
    return;
  }
  stateStore.setState({ activeId: id });
  editor.setEditable(false, false);
  const result = await getNoteById(id);
  if (stateStore.get("activeId") !== id) return;
  if (!result.success) {
    rendererLogger.appError(
      "[handleSelectNote]: Failed to fetch note:",
      result.error,
    );
    return;
  }
  try {
    await checkNoteSize(result.data.content);
    recreateEditorState(editor, result.data.content);
  } catch (error) {
    rendererLogger.appError("Invalid Editor content:", error);
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
}

async function handleDuplicateNote(note: Readonly<Note>) {
  const editor = getAppItem("editor");
  const isAutoExport = isAutoExportEnabled();
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
  const markdown = isAutoExport
    ? editor.markdown?.serialize(note.content)
    : undefined;
  const data: CreateNotePayload = {
    ...rest,
    ...(isAutoExport && markdown !== undefined ? { markdown } : {}),
    links: outgoingLinkIds,
    pinned: false,
  };
  // not handleCreateNote because content is already there
  const result = await createNote(data);
  if (!result.success) {
    rendererLogger.appError(
      "[handleDuplicateNote]: Failed to create duplicate note:",
      result.error,
    );
    return;
  }
  noteStore.setState((state) => ({
    notes: [result.data, ...state.notes],
    visibleIds: [result.data.id, ...state.visibleIds],
    noteIndex: new Map(state.noteIndex).set(result.data.id, result.data),
  }));
}

export {
  debouncedSaveNote,
  handleCreateNote,
  handleDeleteManyNotes,
  handleDeleteNote,
  handleDuplicateNote,
  handleImportNote,
  handleSaveNote,
  handleSelectNote,
  isAutoExportEnabled,
};

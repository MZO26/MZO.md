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
import { applyView } from "@/components/sidebar/sidebar-views";
import { getTableOfContents } from "@/extensions/toc";
import { setImportedContent } from "@/notes/import-actions";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { debounce } from "@/utils/async";
import { DEBOUNCE_MS, UNTAGGED } from "@/utils/constants";
import { getMetadata, titleGenerator } from "@/utils/generators";
import { addActiveTagToDoc, checkNoteSize } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import {
  type CreateNotePayload,
  type Id,
  type Note,
  type UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { FilePathRequest } from "@shared/schemas/request-schema";
import { EMPTY_DOC, UNTITLED } from "@shared/shared-constants";

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
  noteStore.setState((state) => {
    const recentNotes = state.recentNotes.filter(
      (noteId) => noteId !== result.data.id && state.noteIndex.has(noteId),
    );
    return {
      notes: [result.data, ...state.notes],
      visibleIds: [result.data.id, ...state.visibleIds],
      noteIndex: new Map(state.noteIndex).set(result.data.id, result.data),
      recentNotes: [result.data.id, ...recentNotes].slice(0, 5),
    };
  });
  stateStore.setState({ activeId: result.data.id });
  recreateEditorState(editor, editorContent);
  editor.commands.focus();
  const headings = getTableOfContents(editor);
  updateToc(headings);
  updateStats();
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

async function handleDeleteManyNotes(ids: Id[]) {
  const activeId = stateStore.get("activeId");
  const deletedIds = new Set<Id>(ids);
  const isActiveDeleted = activeId !== null && deletedIds.has(activeId as Id);
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
      recentNotes: state.recentNotes.filter((id) => state.noteIndex.has(id)),
    };
  });
  if (isActiveDeleted) {
    stateStore.setState({ activeId: null });
  }
}

async function handleDeleteNote(id: Id) {
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
      recentNotes: state.recentNotes.filter((noteId) => noteId !== id),
    };
  });
  if (isActiveDeletedId) {
    stateStore.setState({ activeId: null });
  }
}

async function handleSaveNote(id: Id, flush: boolean = false) {
  const activeId = stateStore.get("activeId") as Id;
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
  const activeTag = stateStore.get("activeTag");
  const isActiveNote = stateStore.get("activeId") === id;
  const notes = noteStore.get("notes");
  // take snapshot of updated notes to derive update from
  const updatedNotes = notes.map((n) =>
    n.id === result.data.id ? result.data : n,
  );
  // see if new note update did delete active tag
  const tagStillExists =
    activeTag === null ||
    updatedNotes.some((n) =>
      activeTag === UNTAGGED
        ? // if active tag is untagged view, check if note has no tags
          !n.tags?.length
        : // else check if active tag is still included
          n.tags?.includes(activeTag),
    );
  // first update store to updated notes
  noteStore.setState((state) => {
    const noteIndex = new Map(state.noteIndex);
    noteIndex.set(result.data.id, result.data);
    return {
      notes: updatedNotes,
      noteIndex,
    };
  });
  // check if update changed view
  //  if so, recompute visible ids and set active tag to null.
  // else visible ids don't change
  if (!tagStillExists) {
    await applyView(null, updatedNotes);
  }
  if (isActiveNote) {
    updateStats();
    const currentHeadings = getTableOfContents(editor);
    updateToc(currentHeadings);
  }
}

const debouncedSaveNote = debounce(handleSaveNote, DEBOUNCE_MS.slow);

async function handleSelectNote(id: Id) {
  const editor = getAppItem("editor");
  const activeId = stateStore.get("activeId");
  // synchronous flush to avoid overwriting false note
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
  noteStore.setState((state) => {
    const recentNotes = state.recentNotes.filter(
      (noteId) => noteId !== result.data.id && state.noteIndex.has(noteId),
    );
    return {
      recentNotes: [result.data.id, ...recentNotes].slice(0, 5),
    };
  });
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

async function waitForFlush(id: Id | null) {
  if (!id || stateStore.get("activeId") !== id) return false;
  const noteIndex = noteStore.get("noteIndex");
  if (!noteIndex.has(id)) {
    return;
  }
  debouncedSaveNote.cancel();
  await handleSaveNote(id, true);
  return stateStore.get("activeId") === id;
}

async function ensureNoteSaved(id: Id) {
  const savedNote = await waitForFlush(id);
  if (!savedNote) return;
  const note = noteStore.get("noteIndex").get(id);
  if (!note) return;
  return {
    created_at: note.created_at,
    fileName: note.title,
    extension: "md" as const,
    updated_at: note.updated_at,
  };
}

export {
  debouncedSaveNote,
  ensureNoteSaved,
  handleCreateNote,
  handleDeleteManyNotes,
  handleDeleteNote,
  handleDuplicateNote,
  handleImportNote,
  handleSaveNote,
  handleSelectNote,
  isAutoExportEnabled,
  waitForFlush,
};

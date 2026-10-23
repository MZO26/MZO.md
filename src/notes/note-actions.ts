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
import {
  getEditorPos,
  recreateEditorState,
  setSelection,
} from "@/components/editor/editor-actions";
import { initEditorContent } from "@/components/editor/editor-init";
import { updateStats } from "@/components/editor/editor-ui";
import { applyView } from "@/components/sidebar/sidebar-views";
import { addHeadingToDoc } from "@/extensions/overrides/headings";
import { addActiveTagToDoc } from "@/extensions/tag/tag-handler";
import { downgradeDocLinks } from "@/extensions/wikilink/wikilink-handler";
import { setImportedContent } from "@/notes/import-actions";
import { localStore, noteStore, stateStore } from "@/state/state";
import { DEBOUNCE_MS, UNTAGGED } from "@/utils/constants";
import {
  extractText,
  getMetadata,
  titleGenerator,
  wrapAsDoc,
} from "@/utils/generators";
import { debounce, omitKeys } from "@/utils/helpers";
import { useCore } from "@/utils/registry";
import {
  type CreateNotePayload,
  type Id,
  type Note,
  type NoteListItem,
  type UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { FilePathRequest } from "@shared/schemas/request-schema";
import {
  APP_EVENTS,
  EMPTY_DOC,
  MIN_SEARCH_LENGTH,
  UNTITLED,
} from "@shared/shared-constants";
import type { JSONContent } from "@tiptap/core";

async function handleCreateNote(options?: {
  activeTitle?: NoteListItem["title"];
  shouldNavigate?: boolean;
}) {
  const { editor, editorWrapper } = useCore("editor", "editorWrapper");
  const activeTag = stateStore.get("activeTag");
  let editorContent = addActiveTagToDoc(EMPTY_DOC, activeTag);
  if (options?.activeTitle)
    editorContent = addHeadingToDoc(editorContent, options.activeTitle);
  const text = extractText(editorContent);
  const metadata = getMetadata(editorContent);
  const payload: CreateNotePayload = {
    content: editorContent,
    plain_text: text,
    ...metadata,
    title: options?.activeTitle ?? UNTITLED,
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
  if (options?.shouldNavigate) {
    stateStore.setState({ activeId: result.data.id, hoverId: null });
    recreateEditorState(editor, editorContent);
    editor.commands.focus();
    updateStats(editor);
    const { cursorPos, scrollPos } = getEditorPos(editor, editorWrapper);
    localStore.setState((state) => ({
      cursorPos: { ...state.cursorPos, [result.data.id]: cursorPos },
      scrollTop: { ...state.scrollTop, [result.data.id]: scrollPos },
      lastOpenNote: result.data.id,
    }));
  }
  return result.data.id;
}

async function handleImportNote(request: FilePathRequest) {
  const imported = await importNote(
    request.source === "dialog"
      ? request
      : {
          source: "external",
          filePaths: request.filePaths,
          checked: request.checked,
        },
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
  noteStore.setState((state) => {
    const noteIndex = new Map(state.noteIndex);
    for (const note of result.data) {
      noteIndex.set(note.id, note);
    }
    return {
      notes: [...result.data, ...state.notes],
      visibleIds: [...result.data.map((n) => n.id), ...state.visibleIds],
      noteIndex,
    };
  });
  stateStore.setState({ hoverId: null });
}

async function handleDeleteManyNotes(ids: Id[]) {
  const activeId = stateStore.get("activeId") as Id | null;
  const deletedIds = new Set<Id>(ids);
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
      recentNotes: state.recentNotes.filter((id) => state.noteIndex.has(id)),
    };
  });
  stateStore.setState({
    hoverId: null,
    ...(isActiveDeleted && { activeId: null }),
  });
  localStore.setState((state) => {
    return {
      ...state,
      cursorPos: omitKeys(state.cursorPos, deletedIds),
      scrollTop: omitKeys(state.scrollTop, deletedIds),
      ...(isActiveDeleted && { lastOpenNote: null }),
    };
  });
  if (!isActiveDeleted && activeId) {
    const noteIndex = noteStore.get("noteIndex");
    const links = noteIndex.get(activeId)?.links;
    if (links?.some((l) => l.id && !noteIndex.has(l.id))) {
      downgradeDocLinks(noteIndex);
    }
  }
}

async function handleDeleteNote(id: Id) {
  const activeId = stateStore.get("activeId") as Id | null;
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
  stateStore.setState({
    hoverId: null,
    ...(isActiveDeletedId && { activeId: null }),
  });
  localStore.setState((state) => {
    return {
      ...state,
      cursorPos: omitKeys(state.cursorPos, id),
      scrollTop: omitKeys(state.scrollTop, id),
      ...(isActiveDeletedId && { lastOpenNote: null }),
    };
  });
  if (!isActiveDeletedId && activeId) {
    const noteIndex = noteStore.get("noteIndex");
    const needsDowngrade =
      noteIndex.get(activeId)?.links?.some((l) => l.id === id) ?? false;
    if (needsDowngrade) downgradeDocLinks(noteIndex);
  }
}

async function handleSaveNote(id: Id, flush: boolean = false) {
  const activeId = stateStore.get("activeId") as Id | null;
  if (activeId !== id) return;
  const activeNote = noteStore.get("noteIndex").get(activeId);
  if (!activeNote) return;
  const { editor, editorWrapper } = useCore("editor", "editorWrapper");
  const content = editor.getJSON();
  const text = editor.getText();
  const metaData = getMetadata(content);
  const newTitle = titleGenerator(content);
  const payload: UpdateNotePayload = {
    id,
    title: newTitle,
    content,
    plain_text: text,
    ...metaData,
  };
  const result = await updateNote(payload, flush);
  if (!result.success) {
    rendererLogger.appError("[handleSaveNote]: Save failed.", result.error);
    return;
  }
  const activeTag = stateStore.get("activeTag");
  const isActiveNote = stateStore.get("activeId") === id;
  const notes = noteStore.get("notes");
  const updatedNotes = notes.map((n) =>
    n.id === result.data.id ? result.data : n,
  );
  const tagStillExists =
    activeTag === null ||
    updatedNotes.some((n) =>
      activeTag === UNTAGGED ? !n.tags?.length : n.tags?.includes(activeTag),
    );
  noteStore.setState((state) => {
    const noteIndex = new Map(state.noteIndex);
    noteIndex.set(result.data.id, result.data);
    return {
      notes: updatedNotes,
      noteIndex,
    };
  });
  stateStore.setState({ isDirty: false });
  if (!tagStillExists) {
    await applyView(null, updatedNotes);
  }
  if (isActiveNote) {
    updateStats(editor);
    localStore.setState((state) => {
      const { cursorPos, scrollPos } = getEditorPos(editor, editorWrapper);
      return {
        cursorPos: { ...state.cursorPos, [result.data.id]: cursorPos },
        scrollTop: { ...state.scrollTop, [result.data.id]: scrollPos },
        lastOpenNote: result.data.id,
      };
    });
    editor.view.dispatch(editor.state.tr.setMeta("noteInfoRefresh", true));
  }
}

const debouncedSaveNote = debounce(handleSaveNote, DEBOUNCE_MS.slow);

async function waitForFlush(id: Id | null) {
  if (!id || stateStore.get("activeId") !== id) return false;
  const noteIndex = noteStore.get("noteIndex");
  if (!noteIndex.has(id)) {
    const isCurrentlyActive = stateStore.get("activeId") === id;
    stateStore.setState({
      isDirty: false,
      ...(isCurrentlyActive && { activeId: null }),
    });
    return false;
  }
  debouncedSaveNote.cancel();
  await handleSaveNote(id, true);
  return stateStore.get("activeId") === id;
}

async function handleSelectNote(id: Id, options?: { skipRecent?: boolean }) {
  const { editor, editorWrapper } = useCore("editor", "editorWrapper");
  const activeId = stateStore.get("activeId") as Id | null;
  debouncedSaveNote.flush();
  if (activeId === id) {
    rendererLogger.devLog("Skipping select");
    return;
  }
  stateStore.setState({ activeId: id, hoverId: null });
  localStore.setState((state) => {
    if (activeId) {
      const { cursorPos, scrollPos } = getEditorPos(editor, editorWrapper);
      return {
        cursorPos: { ...state.cursorPos, [activeId]: cursorPos },
        scrollTop: { ...state.scrollTop, [activeId]: scrollPos },
        lastOpenNote: id,
      };
    }
    return {
      ...state,
      lastOpenNote: id,
    };
  });
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
  const noteIndex = noteStore.get("noteIndex");
  await initEditorContent({ note: result.data, noteIndex, editor });
  if (stateStore.get("activeId") !== id) return;
  editor.setEditable(true, false);
  setSelection(editor, editorWrapper, result.data.id);
  if (!options?.skipRecent) {
    noteStore.setState((state) => {
      const recentNotes = state.recentNotes.filter(
        (noteId) => noteId !== result.data.id && state.noteIndex.has(noteId),
      );
      return {
        recentNotes: [result.data.id, ...recentNotes].slice(0, 5),
      };
    });
  }
  const globalQuery = stateStore.get("searchQuery");
  if (globalQuery && globalQuery.trim().length > MIN_SEARCH_LENGTH)
    document.dispatchEvent(new CustomEvent(APP_EVENTS.TOGGLE_EDITOR_SEARCH));
}

async function handleExtractToNote(id: Id, content: JSONContent) {
  const doc = wrapAsDoc(content);
  if (!doc) return;
  const activeTag = stateStore.get("activeTag");
  let editorContent = addActiveTagToDoc(doc, activeTag);
  const text = extractText(editorContent);
  const metadata = getMetadata(editorContent);
  const payload: CreateNotePayload = {
    content: doc,
    plain_text: text,
    ...metadata,
    links: [...metadata.links, id],
    title: titleGenerator(editorContent) ?? UNTITLED,
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
  stateStore.setState({ hoverId: null });
  return { id: result.data.id, title: result.data.title };
}

async function handleDuplicateNote(note: Readonly<Note>) {
  const {
    id: originalId,
    links: originalLinks,
    created_at,
    updated_at,
    ...rest
  } = note;
  const outgoingLinkIds = originalLinks
    .filter((link) => link.dir === "out")
    .map((link) => link.id);
  const data: CreateNotePayload = {
    ...rest,
    links: outgoingLinkIds,
    pinned: false,
  };
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
  stateStore.setState({ hoverId: null });
}

export {
  debouncedSaveNote,
  handleCreateNote,
  handleDeleteManyNotes,
  handleDeleteNote,
  handleDuplicateNote,
  handleExtractToNote,
  handleImportNote,
  handleSaveNote,
  handleSelectNote,
  waitForFlush,
};

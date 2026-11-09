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
import {
  getEditorPos,
  recreateEditorState,
  setSelection,
} from "@/components/editor/editor-actions";
import {
  extractText,
  snippetGenerator,
  titleGenerator,
  walkDoc,
  wrapAsDoc,
} from "@/components/editor/editor-generators";
import { initEditorContent } from "@/components/editor/editor-init";
import { updateStats } from "@/components/editor/editor-ui";
import { findExactMatch } from "@/components/sidebar/sidebar-search";
import { applyView } from "@/components/sidebar/sidebar-views";
import { addHeadingToDoc } from "@/extensions/overrides/headings";
import { addActiveTagToDoc } from "@/extensions/tag/tag-handler";
import { downgradeDocLinks } from "@/extensions/wikilink/wikilink-handler";
import { setImportedContent } from "@/notes/import-actions";
import { localStore, noteStore, stateStore } from "@/state/state";
import { DEBOUNCE_MS, UNTAGGED } from "@/utils/constants";
import { debounce, omitKeys, rendererLogger } from "@/utils/helpers";
import { useCore } from "@/utils/registry";
import { appEvents } from "@shared/event-emitter";
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
import { TextSelection } from "@tiptap/pm/state";

/**
 * Creates a new note, optionally pre-filled with the active tag and a title.
 *
 * If `shouldNavigate` is set and another note is currently active, waits for
 * its pending flush to complete first (`waitForFlush`) so no unsaved state is
 * lost. Then builds an empty doc (with the active tag injected), optionally
 * adds a heading from `activeTitle`, and calls `createNote`.
 *
 * On success:
 * - Prepends the new note to `notes` and `visibleIds`; registers it in `noteIndex`.
 * - Inserts the id at the front of `recentNotes` (capped at 5 entries, stale
 *   ids pruned).
 * - If `shouldNavigate`: sets `activeId`, recreates the editor with the new
 *   content, updates stats, and persists initial cursor/scroll position +
 *   `lastOpenNote`.
 *
 * On failure, logs an app error and returns `undefined`.
 *
 * @param [options] – Optional creation context.
 * @param [options.activeTitle] – Title to pre-fill; falls back to `UNTITLED`.
 * @param [options.shouldNavigate=false] – If `true`, switches the editor to
 *   the new note after creation (flushes the previous one first).
 *
 * @returns The created note's id, or `undefined` if creation failed.
 *
 * @example
 * const id = await handleCreateNote();                          // blank note, no navigation
 * const id2 = await handleCreateNote({ activeTitle: "Ideas" }); // titled, no navigation
 * const id3 = await handleCreateNote({ shouldNavigate: true }); // blank + switch to it
 */

async function handleCreateNote(options?: {
  activeTitle?: NoteListItem["title"];
  shouldNavigate?: boolean;
}) {
  const { activeTag, activeId } = stateStore.getState();
  if (options?.shouldNavigate && activeId) {
    await waitForFlush(activeId);
  }
  const { editor, editorWrapper } = useCore("editor", "editorWrapper");
  let editorContent = addActiveTagToDoc(EMPTY_DOC, activeTag);
  if (options?.activeTitle) {
    editorContent = addHeadingToDoc(editorContent, options.activeTitle);
  }
  const text = extractText(editorContent);
  const payload: CreateNotePayload = {
    content: editorContent,
    snippet: snippetGenerator(editorContent),
    plain_text: text,
    ...walkDoc(editorContent),
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

/**
 * Imports one or more files as new notes and prepends them to the local store.
 *
 * Normalizes the incoming `FilePathRequest` (dialog picks are passed through,
 * external paths are reshaped to `{ source: "external", … }`), then runs a
 * three-step pipeline:
 * 1. `importNote` – reads and parses the file(s) on disk.
 * 2. `setImportedContent` – transforms raw imported data into create payloads.
 * 3. `createManyNotes` – persists the processed notes to the backend.
 *
 * Any step failure logs a scoped app error and aborts before local state is touched.
 *
 * On full success:
 * - Shows an "Import Complete" notification with file count, duplicates skipped,
 *   and error count (stats come from the `importNote` response).
 * - Prepends all new notes to `notes` and `visibleIds`; registers them in `noteIndex`.
 * - Clears `hoverId`.
 *
 * Does NOT change `activeId` or open the imported note.
 *
 * @param request - File path(s) and source context for the import.
 *
 * @example
 * await handleImportNote({ source: "dialog", filePaths: ["/path/to/note.md"], checked: true });
 * await handleImportNote({ source: "external", filePaths: ["/a.md", "/b.md"], checked: false });
 */

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

/**
 * Deletes multiple notes from the backend and removes all local references in one pass.
 *
 * Cancels any pending debounced save if the active note is among the targets,
 * calls `deleteManyNotes`, then on success:
 * - Removes every target id from `notes`, `visibleIds`, and `noteIndex`.
 * - Prunes `recentNotes` to only ids that still exist in the updated index.
 * - Clears `hoverId`; if the active note was deleted, also resets `activeId`.
 * - Strips cursor/scroll positions for all deleted ids; if the active note was
 *   among them, clears `lastOpenNote`.
 * - If the active note survived: checks whether it holds links to any of the
 *   deleted ids, downgrades those doc links via `downgradeDocLinks`, and
 *   refreshes the duplicate-link UI.
 *
 * On backend failure, logs an app error and returns without touching local state.
 *
 * @param ids - The note ids to delete.
 *
 * @example
 * await handleDeleteManyNotes(["note-abc123", "note-def456"]); // batch delete + cleanup
 */

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
    const { editor } = useCore("editor");
    editor.view.dispatch(editor.state.tr.setMeta("duplicateLinkRefresh", true));
  }
}

/**
 * Deletes a note from the backend and removes all local references.
 *
 * Cancels any pending debounced save for the target note, calls `deleteNote`,
 * then on success:
 * - Removes the note from `notes`, `visibleIds`, `noteIndex`, and `recentNotes`.
 * - Clears `hoverId`; if the deleted note was the active one, also resets `activeId`.
 * - Strips cursor/scroll positions for that id; if it was active, clears `lastOpenNote`.
 * - If the deleted note was NOT active but another note still is: checks whether
 *   the active note holds links to the deleted id, downgrades those doc links via
 *   `downgradeDocLinks`, and refreshes the duplicate-link UI.
 *
 * On backend failure, logs an app error and returns without touching local state.
 *
 * @param id - The note to delete.
 *
 * @example
 * await handleDeleteNote("note-abc123"); // deletes + full local cleanup
 */

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
    const links = noteIndex.get(activeId)?.links;
    if (links?.some((l) => l.id && !noteIndex.has(l.id))) {
      downgradeDocLinks(noteIndex);
    }
    const { editor } = useCore("editor");
    editor.view.dispatch(editor.state.tr.setMeta("duplicateLinkRefresh", true));
  }
}

/**
 * Saves the active note to the backend and syncs local state.
 *
 * Builds the full update payload (title, snippet, content, plain text,
 * doc links) from the current editor state, calls `updateNote`, then:
 * - Updates the note in the store (list + index).
 * - Clears the dirty flag.
 * - If the active tag filter no longer matches, resets the view.
 * - If the note is still active: updates stats, saves cursor/scroll
 *   position, and refreshes note-info / duplicate-link UI.
 *
 * No-op if `id` does not match the current `activeId`.
 *
 * @param id - The note to save.
 * @param flush - If `true`, bypasses any internal debouncing in `updateNote`.
 *
 * @example
 * await handleSaveNote("note-abc123");          // normal save
 * await handleSaveNote("note-abc123", true);    // forced immediate save
 */

async function handleSaveNote(id: Id, flush: boolean = false) {
  const activeId = stateStore.get("activeId") as Id | null;
  if (activeId !== id) return;
  const activeNote = noteStore.get("noteIndex").get(activeId);
  if (!activeNote) return;
  const { editor, editorWrapper } = useCore("editor", "editorWrapper");
  const content = editor.getJSON();
  const text = editor.getText();
  const newTitle = titleGenerator(content);
  const payload: UpdateNotePayload = {
    id,
    title: newTitle,
    snippet: snippetGenerator(content),
    content,
    plain_text: text,
    ...walkDoc(content),
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
    editor.view.dispatch(
      editor.state.tr
        .setMeta("noteInfoRefresh", true)
        .setMeta("duplicateLinkRefresh", true),
    );
  }
}

const debouncedSaveNote = debounce(handleSaveNote, DEBOUNCE_MS.slow);

/**
 * Forces an immediate save of a note, cancelling any pending debounce.
 *
 * If the note is no longer in the index (e.g. deleted), clears the dirty
 * flag and resets `activeId` if it was pointing to that note.
 *
 * @param id - The note to flush, or `null` to abort.
 * @returns `true` if the note is still active after the save, `false` otherwise.
 *
 * @example
 * const stillActive = await waitForFlush(activeId); // e.g. before switching notes
 */

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

/**
 * Selects and loads a note into the editor.
 *
 * Sequence:
 * 1. Flushes any pending debounced save of the current note.
 * 2. Saves cursor/scroll position of the previously active note.
 * 3. Switches to read-only, fetches the target note, initializes editor content.
 * 4. Restores editability, sets selection, refreshes doc links and recent list.
 *
 * Includes race-condition guards: if `activeId` changes during an `await`,
 * the remaining steps are skipped silently.
 *
 * @param id - The note to select.
 * @param options.skipRecent – If `true`, do not add this note to the recent-notes list.
 *
 * @example
 * await handleSelectNote("note-abc123");
 * await handleSelectNote("note-abc123", { skipRecent: true }); // e.g. from "open in new tab"
 */

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
  await initEditorContent({ note: result.data, editor });
  if (stateStore.get("activeId") !== id) return;
  editor.setEditable(true, false);
  downgradeDocLinks(noteIndex);
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
  editor.view.dispatch(editor.state.tr.setMeta("duplicateLinkRefresh", true));
  const globalQuery = stateStore.get("searchQuery");
  if (globalQuery && globalQuery.trim().length > MIN_SEARCH_LENGTH) {
    appEvents.emit(APP_EVENTS.SYNC_EDITOR_SEARCH, { query: globalQuery });
    const pos = findExactMatch(id, editor.state.tr.doc);
    rendererLogger.devLog("Exact match pos:", pos);
    if (pos !== null) {
      editor.view.dispatch(
        editor.state.tr
          .setSelection(TextSelection.create(editor.state.tr.doc, pos))
          .scrollIntoView(),
      );
    }
    return;
  }
  setSelection(editor, editorWrapper, result.data.id);
}

/**
 * Extracts a content selection into a new standalone note, linking it back to the source.
 *
 * Wraps the provided `content` fragment into a full document (`wrapAsDoc`),
 * injects the active tag, and builds a create payload. The source note's id is
 * appended to the `links` array so the new note carries a back-reference to
 * where it was extracted from. Calls `createNote`, then on success:
 * - Prepends the new note to `notes`, `visibleIds`, and `noteIndex`.
 * - Clears `hoverId`.
 *
 * Does NOT navigate, update `recentNotes`, or touch the editor.
 *
 * No-op (returns `undefined`) if `wrapAsDoc` cannot produce a valid document.
 *
 * @param id – The source note id this content was extracted from; stored as a link in the new note.
 * @param content – The ProseMirror JSON content to extract.
 *
 * @returns `{ id, title }` of the created note, or `undefined` on failure.
 *
 * @example
 * const result = await handleExtractToNote("note-source-abc", selectedJSON);
 * // result → { id: "note-new-xyz", title: "Meeting notes (excerpt)" }
 */

async function handleExtractToNote(id: Id, content: JSONContent) {
  const doc = wrapAsDoc(content);
  if (!doc) return;
  const activeTag = stateStore.get("activeTag");
  let editorContent = addActiveTagToDoc(doc, activeTag);
  const text = extractText(editorContent);
  const extractedData = walkDoc(editorContent);
  const payload: CreateNotePayload = {
    content: editorContent,
    snippet: snippetGenerator(editorContent),
    plain_text: text,
    ...extractedData,
    links: [...extractedData.links, id],
    title: titleGenerator(editorContent) ?? UNTITLED,
    pinned: false,
  };
  const result = await createNote(payload);
  if (!result.success) {
    rendererLogger.appError(
      "[handleExtractToNote]: Failed to create note:",
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

/**
 * Duplicates an existing note and prepends the copy to the local store.
 *
 * Copies all content fields (title, snippet, plain_text, tags, doc links)
 * from the source note, but:
 * - Drops `id`, `created_at`, `updated_at` (regenerated in backend).
 * - Carries over only **outgoing** link ids (`dir === "out"`); incoming links
 *   are intentionally not replicated.
 * - Forces `pinned: false`.
 *
 * Calls `createNote`, then on success:
 * - Prepends the new note to `notes`, `visibleIds`, and `noteIndex`.
 * - Clears `hoverId`.
 *
 * Does NOT navigate, update `recentNotes`, or modify the editor.
 *
 * @param note The source note to duplicate (read-only reference).
 *
 * @example
 * const note = noteStore.get("noteIndex").get(id);
 * if (note) await handleDuplicateNote(note);
 */

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
  handleSelectNote,
  waitForFlush,
};

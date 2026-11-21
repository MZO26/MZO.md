import {
  createManyNotes,
  createNote,
  deleteManyNotes,
  deleteNote,
  getNoteById,
  getPendingOpen,
  importNote,
  showNotification,
  updateNote,
} from "@/api/api";
import { appEvents } from "@/api/event-emitter";
import {
  ensureEditorDoc,
  getEditorPos,
  recreateEditorState,
  setSelection,
} from "@/components/editor/editor-actions";
import {
  extractText,
  snippetGenerator,
  titleGenerator,
  walkDoc,
} from "@/components/editor/editor-generators";
import { initEditorContent } from "@/components/editor/editor-init";
import { updateStats } from "@/components/editor/editor-ui";
import { findExactMatch } from "@/components/quick-switch/quick-switch-search";
import { applyView, restoreSidebarScope } from "@/components/sidebar/sidebar-views";
import { addHeadingToDoc } from "@/extensions/overrides/headings";
import { addActiveTagToDoc } from "@/extensions/tag/tag-handler";
import { downgradeDocLinks } from "@/extensions/wikilink/wikilink-handler";
import { setImportedContent } from "@/notes/import-actions";
import type { WelcomeNote } from "@/notes/welcome-note";
import { localStore, noteStore, stateStore } from "@/state/state";
import { DEBOUNCE_MS, UNTAGGED } from "@/utils/constants";
import { debounce, omitKeys, rendererLogger, withPerformanceLog } from "@/utils/helpers";
import { useCore } from "@/utils/registry";
import { createGlobalSpinner } from "@/utils/ui";
import { workOnMarkdownParsing } from "@/utils/workers/worker-init";
import {
  isNoteID,
  type CreateNotePayload,
  type Id,
  type Note,
  type NoteListItem,
  type UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { FilePathRequest } from "@shared/schemas/request-schema";
import { APP_EVENTS, EMPTY_DOC, MIN_SEARCH_LENGTH, UNTITLED } from "@shared/shared-constants";
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
    rendererLogger.appError("[handleCreateNote]: Failed to create note:", result.error);
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
    rendererLogger.appError("[handleImportNote]: Failed to create imported notes:", result.error);
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
  const activeTag = stateStore.get("activeTag");
  if (activeTag) await applyView(null);
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
    rendererLogger.appError("[handleDeleteManyNotes]: Failed to delete:", result.error);
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
    rendererLogger.appError("[handleDeleteNote]: Failed to delete:", result.error);
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
  const prevNote = notes.find((n) => n.id === result.data.id);
  const updatedNotes = notes.map((n) => (n.id === result.data.id ? result.data : n));
  const tagStillExists =
    activeTag === null ||
    updatedNotes.some((n) =>
      activeTag === UNTAGGED ? !n.tags.length : n.tags.includes(activeTag),
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
  if (activeTag) {
    const hadTag = prevNote?.tags.includes(activeTag) ?? false;
    const hasTag = result.data.tags.includes(activeTag);
    if (!tagStillExists) {
      await applyView(null, updatedNotes);
    } else if (hadTag !== hasTag) {
      rendererLogger.devLog("[handleSaveNote]: Refreshing sidebar scope for active tag");
      restoreSidebarScope(updatedNotes);
    }
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
      editor.state.tr.setMeta("noteInfoRefresh", true).setMeta("duplicateLinkRefresh", true),
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
 * 1. Flushes pending debounced save of the current note.
 * 2. Saves cursor/scroll position of the previously active note.
 * 3. Switches to read-only, fetches the target note, initializes editor content.
 * 4. Restores editability, downgrades doc links, refreshes recent list.
 * 5. If a snippet or search query is present: emits `SYNC_EDITOR_SEARCH`,
 *    locates the exact match in the document, and positions the cursor there.
 *    Otherwise falls back to the saved selection for this note.
 *
 * Race guard: if `activeId` changes during any `await`, remaining steps are skipped.
 *
 * @param id - The note to select.
 * @param options.skipRecent – If `true`, do not add this note to the recent-notes list.
 * @param options.snippet – Highlighted snippet from a search result; used to locate and scroll to the match.
 * @param options.query – Explicit query to sync into the editor search; overrides the global search query.
 *
 * @example
 * await handleSelectNote("note-abc123");
 * await handleSelectNote("note-abc123", { skipRecent: true, snippet: "…exact text…" });
 * await handleSelectNote("note-abc123", { query: "custom override" });
 */

async function handleSelectNote(
  id: Id,
  options?: { skipRecent?: boolean; snippet?: string; query?: string },
) {
  const { skipRecent = false, snippet, query } = options ?? {};
  const { editor, editorWrapper } = useCore("editor", "editorWrapper");
  const activeId = stateStore.get("activeId") as Id | null;
  debouncedSaveNote.flush()?.catch(rendererLogger.appError);
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
    rendererLogger.appError("[handleSelectNote]: Failed to fetch note:", result.error);
    return;
  }
  const noteIndex = noteStore.get("noteIndex");
  await initEditorContent({ note: result.data, editor });
  if (stateStore.get("activeId") !== id) return;
  editor.setEditable(true, false);
  downgradeDocLinks(noteIndex);
  if (!skipRecent) {
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
  if (snippet || (query && query.trim().length > MIN_SEARCH_LENGTH)) {
    if (query) {
      appEvents.emit(APP_EVENTS.SYNC_EDITOR_SEARCH, {
        query,
      });
    }
    const pos = findExactMatch(editor.state.tr.doc, options?.snippet);
    rendererLogger.devLog("Exact match pos:", pos);
    if (pos !== null) {
      const tr = editor.state.tr;
      editor.view.dispatch(tr.setSelection(TextSelection.create(tr.doc, pos)).scrollIntoView());
      editor.view.focus();
    }
    return;
  }
  setSelection(editor, editorWrapper, result.data.id);
}

/**
 * Extracts a content selection into a new standalone note, linking it back to the source.
 *
 * Wraps the provided `content` fragment into a full document (`ensureEditorDoc`) and builds a create payload.
 *  The source note's id is appended to the `links` array  * so the new note carries a back-reference to
 * where it was extracted from. Calls `createNote`, then on success:
 * - Prepends the new note to `notes`, `visibleIds`, and `noteIndex`.
 * - Clears `hoverId`.
 *
 * Does NOT navigate, update `recentNotes`, or touch the editor.
 *
 * No-op (returns `undefined`) if `ensureEditorDoc` cannot produce a valid document.
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
  const doc = ensureEditorDoc(content);
  if (!doc) return;
  const text = extractText(doc);
  const extractedData = walkDoc(doc);
  const payload: CreateNotePayload = {
    content: doc,
    snippet: snippetGenerator(doc),
    plain_text: text,
    ...extractedData,
    links: [...extractedData.links, id],
    title: titleGenerator(doc) ?? UNTITLED,
    pinned: false,
  };
  const result = await createNote(payload);
  if (!result.success) {
    rendererLogger.appError("[handleExtractToNote]: Failed to create note:", result.error);
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
 * Creates a pinned welcome/onboarding note from raw markdown content.
 *
 * Pipeline:
 * 1. Parses `note.content` (Markdown) into an editor JSON string
 *    (`workOnMarkdownParsing`, wrapped in performance logging).
 * 2. Deserialises the string via `JSON.parse`.
 * 3. Validates & normalises through `ensureEditorDoc`.
 * 4. Derives `plain_text`, `snippet`, and extracted data (tags, links)
 *    from the final doc tree.
 *
 * All three parsing/validation steps are independent failure points –
 * each logs an `appError` and returns early (void) without calling the API.
 *
 * On success:
 * - Calls `createNote` with `pinned: true` and the source `note.title`.
 * - Prepends the new note to `notes`, `visibleIds`, and `noteIndex`.
 * - If an `activeTag` filter is currently applied, resets it via
 *   `applyView(null)` so the new pinned note is immediately visible.
 * - Clears `hoverId` and (in applyView) `activeTag`.
 *
 * Does NOT navigate to or select the new note – callers are responsible
 * for that if desired.
 *
 * @param note The welcome note definition (markdown `content` + `title`).
 *             Treated as read-only; never mutated.
 *
 * @returns The id of the newly created note, or `undefined` on any
 *          parsing/validation/API failure.
 *
 * @example
 * const welcome = { title: "Welcome", content: "..." };
 * const id = await handleCreateWelcomeNote(welcome);
 * if (id) handleSelectNote(id); // optional, caller's responsibility
 */

async function handleCreateWelcomeNote(note: Readonly<WelcomeNote>) {
  const parsed = await withPerformanceLog(workOnMarkdownParsing)(note.content);
  if (!parsed.success) {
    rendererLogger.appError("[handleCreateWelcomeNote]: Failed to parse markdown into json");
    return;
  }
  let rawDoc: unknown;
  try {
    rawDoc = JSON.parse(parsed.data);
  } catch (error) {
    rendererLogger.appError("[handleCreateWelcomeNote]: Failed to parse editor JSON:", error);
    return;
  }
  const doc = ensureEditorDoc(rawDoc);
  if (!doc) {
    rendererLogger.appError("[handleCreateWelcomeNote]: No valid editor doc");
    return;
  }
  const text = extractText(doc);
  const extractedData = walkDoc(doc);
  const payload: CreateNotePayload = {
    content: doc,
    snippet: snippetGenerator(doc),
    plain_text: text,
    ...extractedData,
    title: note.title,
    pinned: true,
  };
  const result = await createNote(payload);
  if (!result.success) {
    rendererLogger.appError("[handleCreateWelcomeNote]: Failed to create note:", result.error);
    return;
  }
  noteStore.setState((state) => ({
    notes: [result.data, ...state.notes],
    visibleIds: [result.data.id, ...state.visibleIds],
    noteIndex: new Map(state.noteIndex).set(result.data.id, result.data),
  }));
  const activeTag = stateStore.get("activeTag");
  if (activeTag) await applyView(null);
  stateStore.setState({ hoverId: null });
  return result.data.id;
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
  const { links: originalLinks, ...rest } = note;
  const outgoingLinkIds = originalLinks.flatMap((link) => (link.dir === "out" ? [link.id] : []));
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

/**
 * Resolves and opens the initial note on app startup.
 *
 * Resolution priority (first match wins):
 * 1. **Pending URI request** – a deep-link / protocol-handler open that was
 *    queued before the renderer finished booting (`getPendingOpen`).
 * 2. **Last opened note** – persisted in `localStore` under `"lastOpenNote"`.
 *
 * Both candidates are validated through the same guard: the id must be
 * truthy, pass `isNoteID`, **and** exist in the provided `notes` list.
 * A stale or orphaned id is silently discarded (no error, no fallback
 * beyond the next priority level).
 *
 * On success:
 * - Shows a global loading spinner.
 * - Awaits `handleSelectNote(targetId)` inside the spinner wrapper.
 *
 * Does NOT modify the notes list, update `recentNotes`, or touch the
 * editor state directly – all of that is delegated to `handleSelectNote`.
 * If neither candidate resolves to a valid id, the function is a no-op.
 *
 * @param notes The current, read-only list of note summaries available in
 *             this session. Used solely for existence validation; never mutated.
 *
 * @example
 * // Typically called once during renderer bootstrap:
 * await openInitialNote(noteStore.get("notes"));
 */

async function openInitialNote(notes: readonly NoteListItem[], fallbackId?: Id) {
  const lastOpenId = localStore.get("lastOpenNote");
  const isAvailable = (id: unknown): id is Id =>
    !!id && isNoteID(id) && notes.some((n) => n.id === id);
  const pending = await getPendingOpen();
  rendererLogger.devLog(
    "[openInitialNote]: Pending URI request?",
    pending.success ? pending.data : null,
  );
  const candidates: readonly unknown[] = [
    pending.success ? pending.data : null,
    lastOpenId,
    fallbackId,
  ];
  const targetId = candidates.find(isAvailable);
  if (targetId) {
    const loading = createGlobalSpinner();
    await loading.wrap(() => handleSelectNote(targetId));
  }
}

export {
  debouncedSaveNote,
  handleCreateNote,
  handleCreateWelcomeNote,
  handleDeleteManyNotes,
  handleDeleteNote,
  handleDuplicateNote,
  handleExtractToNote,
  handleImportNote,
  handleSelectNote,
  openInitialNote,
  waitForFlush,
};

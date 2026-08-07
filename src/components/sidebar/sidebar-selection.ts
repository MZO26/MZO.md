import {
  exportManyNotes,
  getAllBackup,
  getManyById,
  pinMany,
  showNotification,
} from "@/api/api";
import { rendererLogger } from "@/app";
import { getCachedEditorExtensions } from "@/components/editor/editor-actions";
import { updateSelectionUI } from "@/components/sidebar/sidebar-selection-ui";
import { getBatchExportContent } from "@/notes/export-actions";
import { handleDeleteManyNotes } from "@/notes/note-actions";
import { confirmWithDialog, deleteDialog } from "@/settings/dialog-init";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { requireElement } from "@/utils/dom";
import type { SelectionAction } from "@/utils/types";
import { createGlobalSpinner } from "@/utils/ui";
import type { Id } from "@shared/schemas/note-schema";
import { MAX_CHARACTERS } from "@shared/shared-constants";
import { generateHTML, generateText } from "@tiptap/core";

function setSelectionMode(enabled: boolean) {
  const prevSelectedIds = stateStore.get("selectedIds");
  const nextSelectedIds = enabled
    ? new Set<Id>(prevSelectedIds)
    : new Set<Id>();
  stateStore.setState({
    selectionMode: enabled,
    selectedIds: nextSelectedIds,
  });
}

function selectAllVisibleNotes() {
  const visibleIds = noteStore.get("visibleIds") ?? [];
  const selectedIds = new Set(visibleIds);
  const selectionMode = true;
  stateStore.setState({
    selectedIds,
    selectionMode,
  });
}

function addToSelection(id: Id) {
  const prevSelectedIds = stateStore.get("selectedIds");
  const nextSelectedIds = new Set(prevSelectedIds);
  if (nextSelectedIds.has(id)) {
    nextSelectedIds.delete(id);
  } else {
    nextSelectedIds.add(id);
  }
  const selectionMode = nextSelectedIds.size > 0;
  stateStore.setState({
    selectedIds: nextSelectedIds,
    selectionMode,
  });
}

async function getSelectionAction(
  action: SelectionAction,
  selectedIds: Set<Id>,
) {
  switch (action) {
    case "cancel":
      setSelectionMode(false);
      break;
    case "pin":
      await pinSelection([...selectedIds]);
      break;
    case "export":
      const loading = createGlobalSpinner();
      await loading.wrap(async () => {
        await exportSelection([...selectedIds]);
      });
      break;
    case "copy-rich-text":
      await copyRichTextSelection([...selectedIds]);
      break;
    case "delete":
      await deleteSelection();
      break;
  }
}

async function copyRichTextSelection(selectedIds: Id[]) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) return;
  const { notes, noteIndex } = noteStore.getState();
  const allSelected =
    selectedIds.length === notes.length &&
    selectedIds.every((id) => noteIndex.has(id));
  const result = allSelected
    ? await getAllBackup()
    : await getManyById(selectedIds);
  if (!result.success) {
    rendererLogger.appError(
      "[copyMarkdownSelection -> getAllBackup | getManyById]: Failed to get notes by id:",
      result.error,
    );
    return;
  }
  let clipboardLimit = 0;
  const clipboardCandidates: { html: string; text: string }[] = [];
  const extensions = getCachedEditorExtensions();
  for (const data of result.data) {
    const text = generateText(data.content, extensions).trim();
    if (clipboardLimit + text.length > MAX_CHARACTERS) break;
    clipboardLimit += text.length;
    clipboardCandidates.push({
      html: generateHTML(data.content, extensions),
      text,
    });
  }
  if (clipboardCandidates.length === 0) {
    await showNotification("Failed to copy to clipboard", "Note is too long");
    return;
  }
  try {
    const html = clipboardCandidates
      .map((item) => item.html)
      .filter((t): t is string => !!t)
      .join("\n<hr>\n");

    const plain = clipboardCandidates
      .map((item) => item.text)
      .filter((t): t is string => !!t)
      .join("\n\n");

    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
    await showNotification("Copied to clipboard", "");
  } catch (error) {
    await showNotification("Failed to copy to clipboard", "");
    rendererLogger.appError(
      "[copyMarkdownSelection]: Failed to copy markdown:",
      error,
    );
  }
}

async function exportSelection(selectedIds: Id[]) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) return;
  const { notes, noteIndex } = noteStore.getState();
  const allSelected =
    selectedIds.length === notes.length &&
    selectedIds.every((id) => noteIndex.has(id));
  const exportResult = allSelected
    ? await getAllBackup()
    : await getManyById(selectedIds);
  if (!exportResult.success) {
    rendererLogger.appError(
      "[exportSelection -> getAllBackup | getManyById]: Failed to get notes by id:",
      exportResult.error,
    );
    return;
  }
  const exportFormat = settingsStore.get("export_format") ?? "md";
  const exportContent = await getBatchExportContent(
    exportResult.data,
    exportFormat,
  );
  if (!exportContent.success) {
    rendererLogger.appError(
      "[exportSelection -> getBatchExportContent]: Failed to get export format",
      exportContent.error,
    );
    return;
  }
  const result = await exportManyNotes(exportContent.data);
  if (!result.success) {
    rendererLogger.appError(
      "[exportSelection -> exportManyNotes]: Export failed or Operation got cancelled:",
      result.error,
    );
    return;
  }
  await showNotification(
    "Export Complete",
    `Exported ${result.data.length} files to .${exportFormat}`,
  );
}

async function pinSelection(selectedIds: Id[]) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) return;
  const pinned = await pinMany(selectedIds);
  if (!pinned.success) {
    rendererLogger.appError(
      "[pinSelection -> pinMany]: Failed to toggle pin:",
      pinned.error,
    );
    return;
  }
  const selectedIdSet = new Set(selectedIds);
  noteStore.setState((state) => {
    const noteIndex = new Map(state.noteIndex);
    const notes = state.notes.map((note) => {
      if (!selectedIdSet.has(note.id)) return note;
      const updatedNote = { ...note, pinned: !note.pinned };
      noteIndex.set(updatedNote.id, updatedNote);
      return updatedNote;
    });
    return {
      ...state,
      notes: notes,
      noteIndex: noteIndex,
    };
  });
  updateSelectionUI({
    selectedIds: selectedIdSet,
    selectionMode: stateStore.get("selectionMode"),
  });
}

async function deleteSelection() {
  const selectedIds = stateStore.get("selectedIds");
  const ids = [...selectedIds];
  if (!Array.isArray(ids) || ids.length === 0) return;
  const confirmed = await confirmWithDialog(
    deleteDialog,
    requireElement<HTMLSpanElement>(".delete-dialog-title", deleteDialog),
    ids.length === 1 ? "Delete this note?" : `Delete ${ids.length} notes?`,
  );
  if (!confirmed) return;
  await handleDeleteManyNotes(ids);
  const nextSelectedIds = new Set(
    [...stateStore.get("selectedIds")].filter((id) => !ids.includes(id)),
  );
  const nextSelectionMode = nextSelectedIds.size === 0 ? false : true;
  stateStore.setState({
    selectedIds: nextSelectedIds,
    selectionMode: nextSelectionMode,
  });
}

export {
  addToSelection,
  copyRichTextSelection,
  deleteSelection,
  exportSelection,
  getSelectionAction,
  pinSelection,
  selectAllVisibleNotes,
  setSelectionMode,
};

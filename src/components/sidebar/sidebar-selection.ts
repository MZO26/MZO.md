import {
  exportManyNotes,
  getAllBackup,
  getManyById,
  pinMany,
  showNotification,
} from "@/api/api";
import {
  setSelectionMode,
  updateSelectionUI,
} from "@/components/sidebar/sidebar-selection-ui";
import { getBatchExportContent } from "@/notes/export-actions";
import { handleDeleteManyNotes } from "@/notes/note-actions";
import { noteStore, settingsStore, stateStore } from "@/settings/app-state";
import { confirmWithDialog, deleteDialog } from "@/settings/dialog-init";
import { requireElement } from "@/utils/dom";
import { MAX_CHARACTERS } from "@shared/constants";
import { generateHTML, generateText } from "@tiptap/core";
import { getCachedEditorExtensions } from "../editor/editor-features";

// sidebar footer selection mode

//-------------------------------------------------------

// selection actions

async function copyRichTextSelection(selectedIds: string[]) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) return;
  const notes = noteStore.get("notes");
  const allSelected =
    selectedIds.length === notes.length &&
    selectedIds.every((id) => notes.some((note) => note.id === id));
  const result = allSelected
    ? await getAllBackup()
    : await getManyById(selectedIds);
  if (!result.success) {
    console.error(
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
      .filter(Boolean)
      .join("\n<hr>\n");

    const plain = clipboardCandidates
      .map((item) => item.text)
      .filter(Boolean)
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
    console.error("[copyMarkdownSelection]: Failed to copy markdown:", error);
  }
}

async function exportSelection(selectedIds: string[]) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) return;
  const notes = noteStore.get("notes");
  const allSelected =
    selectedIds.length === notes.length &&
    selectedIds.every((id) => notes.some((note) => note.id === id));
  const exportResult = allSelected
    ? await getAllBackup()
    : await getManyById(selectedIds);
  if (!exportResult.success) {
    console.error(
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
    console.error(
      "[exportSelection -> getBatchExportContent]: Failed to get export format",
      exportContent.error,
    );
    return;
  }
  const result = await exportManyNotes(exportContent.data);
  if (!result.success) {
    console.error(
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

async function pinSelection(selectedIds: string[]) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) return;
  const pinned = await pinMany(selectedIds);
  if (!pinned.success) {
    console.error(
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
  updateSelectionUI();
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
  stateStore.setState({ selectedIds: nextSelectedIds });
  if (nextSelectedIds.size === 0) {
    setSelectionMode(false);
  } else {
    updateSelectionUI();
  }
}

export {
  copyRichTextSelection,
  deleteSelection,
  exportSelection,
  pinSelection,
  setSelectionMode,
  updateSelectionUI,
};

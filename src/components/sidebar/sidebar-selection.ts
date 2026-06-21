import {
  exportManyNotes,
  getAllBackup,
  getManyById,
  pinMany,
  showNotification,
} from "@/api/api";
import { deleteDialog } from "@/api/callbacks";
import { getBatchExportContent } from "@/notes/export-actions";
import { handleDeleteManyNotes } from "@/notes/note-actions";
import { noteStore, settingsStore, stateStore } from "@/settings/app-state";
import { findElement, requireElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { getAppItem, getUIItem } from "@/utils/registry";
import { SELECTION_ACTIONS } from "@shared/constants";

// sidebar footer selection mode

//-------------------------------------------------------

// selection ui

function selectAllVisibleNotes() {
  const visibleIds = noteStore.get("visibleIds") ?? [];
  stateStore.setState({
    selectedIds: new Set(visibleIds),
    selectionMode: true,
  });
  updateSelectionUI();
}

function initSelectionFooter() {
  const selectionFooter = getUIItem("selectionFooter");
  if (selectionFooter.childElementCount > 0) return;
  const frag = document.createDocumentFragment();
  for (const action of SELECTION_ACTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${action.id}-btn`;
    button.setAttribute("data-action", action.id);
    button.setAttribute("data-tippy-dynamic", "");
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", action.icon);
    button.appendChild(icon);
    frag.appendChild(button);
  }
  selectionFooter.appendChild(frag);
  renderIcons(selectionFooter);
}

function getActionLabel(actionId: string, selectedCount: number): string {
  switch (actionId) {
    case "cancel":
      return "Cancel selection";
    case "pin":
      return `Toggle Pin for ${selectedCount} ${selectedCount === 1 ? "note" : "notes"}`;
    case "export":
      return `Export ${selectedCount} ${selectedCount === 1 ? "note" : "notes"}`;
    case "copy-links":
      return `Copy ${selectedCount} ${selectedCount === 1 ? "wikilink" : "wikilinks"}`;
    case "copy-rich-text":
      return `Copy rich-text of ${selectedCount} ${selectedCount === 1 ? "note" : "notes"}`;
    case "delete":
      return `Delete ${selectedCount} ${selectedCount === 1 ? "note" : "notes"}`;
    default:
      return "";
  }
}

function updateSelectionFooter() {
  const selectionMode = stateStore.get("selectionMode");
  const selectedCount = stateStore.get("selectedIds").size;
  const selectionFooter = getUIItem("selectionFooter");
  selectionFooter.classList.toggle("collapsed", !selectionMode);
  for (const action of SELECTION_ACTIONS) {
    const button = findElement<HTMLButtonElement>(
      `.${action.id}-btn`,
      selectionFooter,
    );
    if (!button) continue;
    const label = getActionLabel(action.id, selectedCount);
    button.setAttribute("data-tippy-content", label);
    button.disabled = selectedCount === 0 && action.id !== "cancel";
  }
}

function setSelectionMode(enabled: boolean) {
  stateStore.setState({
    selectionMode: enabled,
    selectedIds: enabled ? stateStore.get("selectedIds") : new Set(),
  });
  updateSelectionUI();
}

function updateSelectionUI() {
  const selectedIds = stateStore.get("selectedIds");
  const selectionMode = stateStore.get("selectionMode");
  const sidebar = getAppItem("sidebar");
  sidebar.classList.toggle("selection-mode", selectionMode);
  const noteItems = sidebar.querySelectorAll<HTMLDivElement>(".note-item");
  for (const item of noteItems) {
    const id = item.getAttribute("data-id");
    const isSelected = !!id && selectedIds.has(id);
    item.classList.toggle("selected", isSelected);
    const checkbox = findElement<HTMLInputElement>(".select-checkbox", item);
    if (checkbox) {
      checkbox.checked = isSelected;
    }
  }
  initSelectionFooter();
  updateSelectionFooter();
}

//-------------------------------------------------------

// selection actions

async function copyRichTextSelection(selectedIds: string[]) {
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
  const content = await getBatchExportContent(result.data, "html");
  if (!content.success) {
    console.error(
      "[copyMarkdownSelection -> getBatchExportContent]: Failed to get markdown:",
      content.error,
    );
    await showNotification("Failed to get Markdown.", "");
    return;
  }
  try {
    const html = content.data
      .map((item) => item.content.trim())
      .filter(Boolean)
      .join("\n<hr>\n");

    const plain = content.data
      .map((item) => item.content.trim())
      .filter(Boolean)
      .join("\n\n");

    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
    await showNotification("Copied to clipboard.", "");
  } catch (error) {
    await showNotification("Failed to copy to clipboard.", "");
    console.error("[copyMarkdownSelection]: Failed to copy markdown:", error);
  }
}

async function copyLinkSelection(selectedIds: string[]) {
  try {
    const text = [...selectedIds].join("\n");
    await navigator.clipboard.writeText(text);
    await showNotification("Copied to clipboard.", "");
  } catch (error) {
    await showNotification("Failed to copy to clipboard.", "");
    console.error("[copyLinkSelection]: Failed to copy links:", error);
  }
}

async function exportSelection(selectedIds: string[]) {
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
  const exportFormat = settingsStore.get("export-format") ?? "md";
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
    "Export Successful.",
    `${result.data.length} files exported to .${exportFormat}`,
  );
}

async function pinSelection(selectedIds: string[]) {
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
      sidebarChange: { type: "reload" },
    };
  });
  updateSelectionUI();
}

async function deleteSelection() {
  const selectedIds = stateStore.get("selectedIds");
  const ids = [...selectedIds];
  if (ids.length === 0) return;
  const deleteDialogTitle = requireElement<HTMLSpanElement>(
    ".delete-dialog-title",
    deleteDialog,
  );
  deleteDialogTitle.textContent =
    ids.length === 1 ? `Delete this note?` : `Delete ${ids.length} notes?`;
  const handleClose = async () => {
    if (deleteDialog.returnValue !== "confirm") {
      deleteDialogTitle.textContent = "";
      return;
    }
    await handleDeleteManyNotes(ids);
    const nextSelectedIds = new Set(
      [...stateStore.get("selectedIds")].filter((id) => !ids.includes(id)),
    );
    stateStore.setState({
      selectedIds: nextSelectedIds,
    });
    if (nextSelectedIds.size === 0) {
      setSelectionMode(false);
    } else {
      updateSelectionUI();
    }
    deleteDialogTitle.textContent = "";
  };
  deleteDialog.addEventListener("close", handleClose, { once: true });
  deleteDialog.returnValue = "";
  deleteDialog.showModal();
}

export {
  copyLinkSelection,
  copyRichTextSelection,
  deleteSelection,
  exportSelection,
  pinSelection,
  selectAllVisibleNotes,
  setSelectionMode,
  updateSelectionUI,
};

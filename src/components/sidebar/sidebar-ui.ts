import { localStore, settingsStore } from "@/state/state";
import { DOMPURIFY_CONFIG, SIDEBAR_ALL_NOTES_LIMIT, UNTAGGED } from "@/utils/constants";
import { formatNoteDate } from "@/utils/date";
import { rendererLogger } from "@/utils/helpers";
import { renderIcons } from "@/utils/icons";
import { useCore } from "@/utils/registry";
import type { FilterMode, SelectionParams, SidebarParams, SnippetGenParams } from "@/utils/types";
import {
  createIconButton,
  createInfoSpan,
  createTemplateCloner,
  isDiv,
  requireElement,
  setActiveItem,
} from "@/utils/ui";
import { isNoteID, type NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import { UNTITLED } from "@shared/shared-constants";
import DOMPurify from "dompurify";

const getNoteItemClone = createTemplateCloner("noteItemTemplate", isDiv);

function sanitizeSnippets({ note, snippets }: Pick<SnippetGenParams, "note" | "snippets">) {
  const searchSnippet = snippets?.[note.id];
  const displaySnippet = searchSnippet ?? note.snippet;
  const safe = DOMPurify.sanitize(displaySnippet, DOMPURIFY_CONFIG);
  return safe;
}

function createNoteItem(note: NoteListItem, display: AppSettings["note_item_display"]) {
  const item = getNoteItemClone();
  item.setAttribute("data-id", note.id);
  item.setAttribute("data-pinned", String(!!note.pinned));
  const safeTitle = note.title.trim() || UNTITLED;
  item.title = safeTitle;
  if (note.pinned) renderIcons(item);
  const titleEl = item.querySelector<HTMLSpanElement>(".note-title");
  if (titleEl) titleEl.textContent = safeTitle;
  const dateEl = item.querySelector<HTMLDivElement>(".note-date");
  if (dateEl) dateEl.textContent = formatNoteDate(note.created_at);
  const contentEl = item.querySelector<HTMLDivElement>(".note-content");
  if (contentEl && display === "preview") {
    contentEl.textContent = note.snippet;
  }
  return item;
}

function updateSelectionUI(selectionParams: SelectionParams) {
  const { selectionMode, selectedIds } = selectionParams;
  const { sidebar } = useCore("sidebar");
  sidebar.classList.toggle("selection-mode", selectionMode);
  const noteItems = sidebar.querySelectorAll<HTMLDivElement>(".note-item");
  for (const item of noteItems) {
    const id = item.getAttribute("data-id");
    if (!isNoteID(id)) continue;
    const isSelected = selectionMode && !!id && selectedIds.has(id);
    item.classList.toggle("is-selected", isSelected);
  }
}

function getTagDisplayLabel(tag: string): string {
  if (tag === UNTAGGED) return "Untagged";
  return `#${tag}`;
}

function createActiveTagHeader(tag: string): HTMLDivElement {
  const header = document.createElement("div");
  header.className = "active-tag-header";
  const label = document.createElement("span");
  label.textContent = getTagDisplayLabel(tag);
  const clearBtn = createIconButton("X");
  clearBtn.className = "active-tag-clear-btn";
  clearBtn.setAttribute("data-action", "clear-active-tag");
  header.append(label, clearBtn);
  renderIcons(clearBtn);
  return header;
}

function createInfoHeader(text: string) {
  const header = document.createElement("div");
  header.className = "sidebar-info-header";
  const label = document.createElement("span");
  label.textContent = text;
  header.appendChild(label);
  return header;
}

function handleHeaderChange(change: FilterMode, activeTag?: string) {
  switch (change) {
    case "tag":
      if (!activeTag) {
        rendererLogger.devLog("[handleHeaderChange]: No active tag found:");
        return;
      }
      return createActiveTagHeader(activeTag);
    case "recent":
      return createInfoHeader("Recent");
    default:
      change satisfies never;
      return;
  }
}

const getSidebarEmptyStateClone = createTemplateCloner("sidebarEmptyStateTemplate", isDiv);

let emptyStateClone: HTMLDivElement | null = null;

function renderSidebarEmptyState() {
  const { sidebar } = useCore("sidebar");
  if (!emptyStateClone) {
    emptyStateClone = getSidebarEmptyStateClone();
    renderIcons(emptyStateClone);
  }
  const titleEl = requireElement<HTMLHeadingElement>(".empty-state-title", emptyStateClone);
  titleEl.textContent = "No notes here";
  sidebar.replaceChildren(emptyStateClone);
}

function toggleSidebar(collapsed: boolean) {
  const { appContainer } = useCore("appContainer");
  appContainer.classList.toggle("collapsed", collapsed);
}

function handleSidebarChange(sidebarParams: SidebarParams) {
  if (sidebarParams.visibleNotes.length === 0) {
    renderSidebarEmptyState();
    return;
  }
  renderNoteList(sidebarParams);
}

function renderNoteList({ visibleNotes, activeTag, activeId }: SidebarParams) {
  const { sidebar } = useCore("sidebar");
  const fragment = document.createDocumentFragment();
  let activeElement: HTMLDivElement | null = null;
  const currentMode: FilterMode = activeTag ? "tag" : "recent";
  const displaySetting = settingsStore.get("note_item_display");
  const headerElement = handleHeaderChange(currentMode, activeTag ?? undefined);
  if (headerElement) {
    fragment.appendChild(headerElement);
  }
  const isFiltered = !!activeTag;
  const isLimited = !isFiltered && visibleNotes.length > SIDEBAR_ALL_NOTES_LIMIT;
  const displayNotes = isFiltered ? visibleNotes : visibleNotes.slice(0, SIDEBAR_ALL_NOTES_LIMIT);
  for (const note of displayNotes) {
    const item = createNoteItem(note, displaySetting);
    if (note.id === activeId) {
      activeElement = item;
    }
    fragment.appendChild(item);
  }
  if (isLimited) {
    fragment.appendChild(
      createInfoSpan(
        `Showing ${SIDEBAR_ALL_NOTES_LIMIT} of ${visibleNotes.length} notes.\nUse search or tags to narrow the list.`,
        "note-list-info",
      ),
    );
  }
  sidebar.replaceChildren(fragment);
  if (activeElement) {
    setActiveItem(activeElement, sidebar);
  }
}

function resizeSidebar() {
  const storedWidth = localStore.get("sidebarWidth");
  if (typeof storedWidth === "number" && Number.isInteger(storedWidth) && storedWidth > 0) {
    document.documentElement.style.setProperty("--sidebar-width", `${storedWidth}px`);
  }
  const minWidth = 0;
  const maxWidth = 420;
  const { sidebarContainer } = useCore("sidebarContainer");
  const resizer = requireElement<HTMLDivElement>(".resizer-sidebar", sidebarContainer);

  let isResizing = false;
  let isUpdatePending = false;
  let startX = 0;
  let startWidth = 0;
  let currentWidth = 0;

  const pointerDownHandler = (e: PointerEvent) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebarContainer.getBoundingClientRect().width;
    currentWidth = startWidth;
    resizer.setPointerCapture(e.pointerId);
    document.body.classList.add("is-dragging");
    document.body.style.userSelect = "none";
  };
  const pointerMoveHandler = (e: PointerEvent) => {
    if (!isResizing || isUpdatePending) return;
    isUpdatePending = true;
    requestAnimationFrame(() => {
      const deltaX = e.clientX - startX;
      const adjustedWidth = startWidth + deltaX;
      currentWidth = Math.max(minWidth, Math.min(adjustedWidth, maxWidth));
      document.documentElement.style.setProperty("--sidebar-width", `${currentWidth}px`);
      isUpdatePending = false;
    });
  };
  const pointerUpHandler = (e: PointerEvent) => {
    if (isResizing) {
      isResizing = false;
      if (resizer.hasPointerCapture(e.pointerId)) {
        resizer.releasePointerCapture(e.pointerId);
      }
      document.body.classList.remove("is-dragging");
      document.body.style.userSelect = "";
      localStore.setState({ sidebarWidth: currentWidth });
    }
  };
  resizer.addEventListener("pointerdown", pointerDownHandler);
  document.addEventListener("pointermove", pointerMoveHandler);
  document.addEventListener("pointerup", pointerUpHandler);
  return function unsubscribe() {
    resizer.removeEventListener("pointerdown", pointerDownHandler);
    document.removeEventListener("pointermove", pointerMoveHandler);
    document.removeEventListener("pointerup", pointerUpHandler);
  };
}

export { handleSidebarChange, resizeSidebar, sanitizeSnippets, toggleSidebar, updateSelectionUI };

import { pinWindow, updateSettings } from "@/api/api";
import { rendererLogger } from "@/app";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { renderIcons } from "@/utils/icons";
import { getAppItem, getUIItem } from "@/utils/registry";
import { UNTITLED } from "@shared/constants/renderer-constants";
import type { Link } from "@shared/schemas/note-schema";

function setEditorWidth(container: HTMLDivElement) {
  const widths = ["comfortable", "normal", "wide"];
  const current = container.getAttribute("data-width") || "normal";
  const index = widths.indexOf(current as (typeof widths)[number]);
  const next = widths[(index + 1) % widths.length];
  if (!next) return;
  container.setAttribute("data-width", next);
}

async function setWindowTop(toggleBtn: HTMLButtonElement) {
  const result = await pinWindow();
  if (!result.success) {
    rendererLogger.appError(
      "[setWindowTop]: Failed to pin window:",
      result.error,
    );
    return;
  }
  toggleBtn.classList.toggle("pin", result.data);
}

function initFocusMode() {
  const appContainer = getAppItem("appContainer");
  const newState = !appContainer.classList.contains("focus");
  appContainer.classList.toggle("focus", newState);
}

function setToolbarCollapsed(collapsed: boolean) {
  const appContainer = getAppItem("appContainer");
  appContainer.classList.toggle("toolbar-collapsed", collapsed);
}

function toggleToolbar() {
  const newState = !settingsStore.get("toolbar_collapsed");
  try {
    setToolbarCollapsed(newState);
  } finally {
    document.dispatchEvent(new CustomEvent("app:refresh-toolbar"));
    rendererLogger.devLog("Dispatched toolbar refresh");
  }
  updateSettings({ toolbar_collapsed: newState });
}

function openMetadataContainer() {
  const metadataContainer = getUIItem("metadataContainer");
  const collapsed = metadataContainer.classList.contains("collapsed");
  if (collapsed) metadataContainer.classList.remove("collapsed");
  return metadataContainer;
}

function renderLinksToolbar(container: HTMLDivElement) {
  const activeId = stateStore.get("activeId");
  if (!activeId) return;
  const noteIndex = noteStore.get("noteIndex");
  const activeNote = noteIndex.get(activeId);
  container.replaceChildren();
  if (!activeNote) return;
  const backlinks: Link[] = [];
  const outgoingLinks: Link[] = [];
  for (const link of activeNote.links) {
    if (link.id === activeNote.id) continue;
    if (link.dir === "in") {
      backlinks.push(link);
    } else if (link.dir === "out") {
      outgoingLinks.push(link);
    }
  }
  if (backlinks.length === 0 && outgoingLinks.length === 0) {
    const span = document.createElement("span");
    span.classList.add("link", `link-current`);
    span.setAttribute("data-link", activeNote.id);
    span.title = "Current Note";
    span.textContent = `[${activeNote.title}]`;
    span.classList.add("active-node");
    container.appendChild(span);
    return;
  }
  const displaySequence = [
    ...backlinks.map((b) => ({ id: b.id, type: "in" })),
    { id: activeNote.id, type: "current" },
    ...outgoingLinks.map((l) => ({ id: l.id, type: "out" })),
  ];
  const relatedIds = new Set([...backlinks, ...outgoingLinks].map((n) => n.id));
  const linkMap = new Map<string, string>();
  for (const id of relatedIds) {
    const note = noteIndex.get(id);
    if (note) linkMap.set(note.id, note.title.trim() || UNTITLED);
  }
  for (const [index, item] of displaySequence.entries()) {
    const span = document.createElement("span");
    span.classList.add("link", `link-${item.type}`);
    span.setAttribute("data-link", item.id);
    const text =
      item.type === "in"
        ? "Incoming Link"
        : item.type === "out"
          ? "Outgoing Link"
          : "Current Note";
    span.title = text;
    const title =
      item.type === "current"
        ? activeNote.title
        : (linkMap.get(item.id) ?? item.id);
    if (item.type === "current") {
      span.textContent = `[${title}]`;
      span.classList.add("active-node");
    } else {
      span.textContent = title;
    }
    container.appendChild(span);
    if (index < displaySequence.length - 1) {
      const icon = document.createElement("i");
      icon.setAttribute("data-lucide", "arrow-right");
      icon.classList.add("separator-icon");
      container.appendChild(icon);
    }
  }
  renderIcons(container);
}

export {
  initFocusMode,
  openMetadataContainer,
  renderLinksToolbar,
  setEditorWidth,
  setToolbarCollapsed,
  setWindowTop,
  toggleToolbar,
};

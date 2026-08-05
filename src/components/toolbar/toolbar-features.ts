import { pinWindow } from "@/api/api";
import { rendererLogger } from "@/app";
import { renderIcons } from "@/utils/icons";
import { getAppItem, getUIItem } from "@/utils/registry";
import { UNTITLED } from "@shared/constants/renderer-constants";
import type { Link, NoteListItem } from "@shared/schemas/note-schema";
import type { DisplaySequenceParams, LinkDisplaySequence } from "@shared/types";

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

function setFocusMode() {
  const appContainer = getAppItem("appContainer");
  const newState = !appContainer.classList.contains("focus");
  appContainer.classList.toggle("focus", newState);
}

function setToolbarCollapsed(collapsed: boolean) {
  const appContainer = getAppItem("appContainer");
  appContainer.classList.toggle("toolbar-collapsed", collapsed);
}

function toggleMetadataContainer() {
  const metadataContainer = getUIItem("metadataContainer");
  const collapsed = metadataContainer.classList.contains("collapsed");
  const newState = !collapsed;
  metadataContainer.classList.toggle("collapsed", newState);
  return metadataContainer;
}

function computeActiveNoteLinks(activeNote: NoteListItem) {
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
  return { backlinks, outgoingLinks };
}

function getDisplaySequence(params: DisplaySequenceParams) {
  const { activeNote, noteIndex, backlinks, outgoingLinks } = params;
  const displaySequence = [
    ...backlinks.map((b) => ({ id: b.id, type: "in" as const })),
    { id: activeNote.id, type: "current" as const },
    ...outgoingLinks.map((l) => ({ id: l.id, type: "out" as const })),
  ];
  const relatedIds = new Set([...backlinks, ...outgoingLinks].map((n) => n.id));
  const linkMap = new Map<string, string>();
  for (const id of relatedIds) {
    const note = noteIndex.get(id);
    if (note) linkMap.set(note.id, note.title.trim() || UNTITLED);
  }
  return { displaySequence, linkMap };
}

function renderCurrentNoteLink(
  container: HTMLDivElement,
  activeNote: NoteListItem,
) {
  const span = document.createElement("span");
  span.classList.add("link", `link-current`);
  span.setAttribute("data-link", activeNote.id);
  span.title = "Current Note";
  span.textContent = `[${activeNote.title}]`;
  span.classList.add("active-node");
  container.appendChild(span);
  return;
}

function renderLinkElement(
  activeNote: NoteListItem,
  linkMap: Map<string, string>,
  item: LinkDisplaySequence,
) {
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
  return span;
}

function renderLinksToolbar(
  activeNote: NoteListItem,
  noteIndex: Map<string, NoteListItem>,
  container: HTMLDivElement,
) {
  const { backlinks, outgoingLinks } = computeActiveNoteLinks(activeNote);
  container.replaceChildren();
  if (backlinks.length === 0 && outgoingLinks.length === 0) {
    renderCurrentNoteLink(container, activeNote);
    return;
  }
  const { displaySequence, linkMap } = getDisplaySequence({
    activeNote,
    noteIndex,
    backlinks,
    outgoingLinks,
  });
  for (const [index, item] of displaySequence.entries()) {
    const span = renderLinkElement(activeNote, linkMap, item);
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
  renderLinksToolbar,
  setEditorWidth,
  setFocusMode,
  setToolbarCollapsed,
  setWindowTop,
  toggleMetadataContainer,
};

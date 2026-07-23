import { pinWindow, setTheme, updateSettings } from "@/api/api";
import { createDivider } from "@/components/toolbar/toolbar-factory";
import { noteStore, stateStore } from "@/settings/app-state";
import { createInfoSpan } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { getAppItem, getUIItem } from "@/utils/registry";
import type { Theme } from "@shared/schemas/store-schema";
import { toolbarApi } from "./toolbar-init";

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
    console.error("[setWindowTop]: Failed to pin window:", result.error);
    return;
  }
  toggleBtn.classList.toggle("pin", result.data);
}

function initFocusMode() {
  const appContainer = getAppItem("appContainer");
  const newState = !appContainer.classList.contains("focus");
  const isToolbarCollapsed =
    appContainer.classList.contains("toolbar-collapsed");
  requestAnimationFrame(() => {
    appContainer.classList.toggle("focus", newState);
    if (isToolbarCollapsed) return;
    setTheme(
      document.documentElement.getAttribute("data-theme") as Exclude<
        Theme,
        "system"
      >,
      newState,
    ).catch((error: unknown) => {
      console.error(
        "[initFocusMode -> setTheme]: Failed to sync theme with main process.",
        error,
      );
    });
  });
}

async function setToolbarCollapsed(collapsed: boolean) {
  const appContainer = getAppItem("appContainer");
  const isFocus = appContainer.classList.contains("focus");
  requestAnimationFrame(async () => {
    appContainer.classList.toggle("toolbar-collapsed", collapsed);
    if (isFocus) return;
    await setTheme(
      document.documentElement.getAttribute("data-theme") as Exclude<
        Theme,
        "system"
      >,
      collapsed,
    )
      .catch((error: unknown) => {
        console.error(
          "[initFocusMode -> setTheme]: Failed to sync theme with main process.",
          error,
        );
      })
      .finally(() => toolbarApi?.refresh());
  });
}

async function toggleToolbar() {
  const appContainer = getAppItem("appContainer");
  const newState = !appContainer.classList.contains("toolbar-collapsed");
  await setToolbarCollapsed(newState);
  updateSettings({ toolbar_collapsed: newState });
}

function openMetadataContainer() {
  const metadataContainer = getUIItem("metadataContainer");
  const collapsed = metadataContainer.classList.contains("collapsed");
  if (collapsed) metadataContainer.classList.remove("collapsed");
  return metadataContainer;
}

function createTagElement(
  container: HTMLDivElement,
  tag: string,
  count?: number,
) {
  const span = document.createElement("span");
  span.className = "tag-node";
  span.setAttribute("data-tag", tag);
  const text = count
    ? `Often used: Appears ${count} time${count === 1 ? "" : "s"} in other note${count === 1 ? "" : "s"}`
    : "Tag in this note";
  span.setAttribute("data-tippy-content", text);
  span.textContent = `#${tag}`;
  container.appendChild(span);
}

function renderTags(container: HTMLDivElement) {
  const activeId = stateStore.get("activeId");
  if (!activeId) return;
  const activeTags = noteStore.get("noteIndex").get(activeId)?.tags;
  if (!activeTags) return;
  container.replaceChildren();
  const tagMap = new Map<string, number>();
  const tagArr = noteStore
    .get("notes")
    .filter((n) => n.id !== activeId)
    .flatMap((n) => n.tags);
  for (const entry of tagArr) {
    tagMap.set(entry, (tagMap.get(entry) || 0) + 1);
  }
  const sortedTags = [...tagMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (activeTags && activeTags.length > 0) {
    for (const tag of activeTags) createTagElement(container, tag);
    container.appendChild(createDivider());
  }
  if ((!activeTags || activeTags.length === 0) && sortedTags.length === 0) {
    const span = createInfoSpan(
      "No tags here. Create your first tag by writing #tag + Space",
    );
    container.appendChild(span);
    return;
  }
  for (const [item, count] of sortedTags) {
    createTagElement(container, item, count);
  }
}

function renderLinks(container: HTMLDivElement) {
  const activeId = stateStore.get("activeId");
  if (!activeId) return;
  const activeNote = noteStore.get("noteIndex").get(activeId);
  container.replaceChildren();
  if (!activeNote) return;
  const validLinks = activeNote.links.filter((l) => l.id !== activeNote.id);
  const backlinks = validLinks.filter((l) => l.dir === "in");
  const outgoingLinks = validLinks.filter((l) => l.dir === "out");
  if (
    (backlinks.length === 0 && outgoingLinks.length === 0) ||
    validLinks.length === 0
  ) {
    const span = document.createElement("span");
    span.classList.add("link", `link-current`);
    span.setAttribute("data-link", activeNote.id);
    span.setAttribute("data-tippy-content", "Current Note");
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
  const relatedNotes = noteStore
    .get("notes")
    .filter((n) => relatedIds.has(n.id));
  const linkMap = new Map<string, string>();
  for (const note of relatedNotes) {
    linkMap.set(note.id, note.title.trim());
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
    span.setAttribute("data-tippy-content", text);
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
  renderLinks,
  renderTags,
  setEditorWidth,
  setToolbarCollapsed,
  setWindowTop,
  toggleToolbar,
};

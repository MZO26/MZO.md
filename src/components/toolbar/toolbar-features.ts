import { pinWindow, setTheme } from "@/api/api";
import { handleSearchInput } from "@/components/sidebar/sidebar-features";
import { createDivider } from "@/components/toolbar/toolbar-factory";
import { promptImageUpload } from "@/extensions/image/image";
import { handleSelectNote } from "@/notes/note-actions";
import { noteStore, stateStore } from "@/settings/app-state";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { getAppItem, getUIItem, registerAppEvents } from "@/utils/registry";
import { initTippyDelegate } from "@/utils/ui";
import type { Theme } from "@shared/schemas/store-schema";
import type { ActionMap, AllTagsMenu } from "@shared/types";
import tippy from "tippy.js";

// top-toolbar for quick actions

let allTagsMenu: AllTagsMenu | null = null;

function initTopToolbar() {
  const appContainer = getAppItem("appContainer");
  const editor = getAppItem("editor");
  const appPinBtn = requireElement<HTMLButtonElement>(".app-pin-btn");
  appPinBtn.addEventListener(
    "click",
    createAsyncHandler(async () => setWindowTop(appPinBtn)),
  );
  const metadataContainer = getUIItem("metadataContainer");
  metadataContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const clickedLink = target.closest(".link") as HTMLElement | null;
    const linkId = clickedLink?.getAttribute("data-link");
    if (linkId === stateStore.get("activeId")) return;
    if (clickedLink && linkId) {
      handleSelectNote(linkId);
      return;
    }
    const clickedTag = target.closest(".tag-node") as HTMLElement | null;
    const tagId = clickedTag?.getAttribute("data-tag");
    if (clickedTag && tagId) {
      const searchInput = requireElement<HTMLInputElement>(".search-input");
      searchInput.value = `#${tagId}`;
      searchInput.focus();
      handleSearchInput(tagId);
      return;
    }
  });
  const editorWrapper = getAppItem("editorWrapper");
  editorWrapper.addEventListener("focusin", () => {
    metadataContainer.classList.add("collapsed");
  });
  registerAppEvents(document, {
    "app:set-editor-width": () => setEditorWidth(appContainer),
    "app:toggle-read-only": () => editor?.setEditable(!editor.isEditable),
    "app:toggle-focus-mode": () => initFocusMode(),
    "app:exit-focus-mode": () => {
      if (appContainer.classList.contains("focus")) {
        initFocusMode();
      }
    },
    "app:toggle-toolbar": () => toggleToolbar(),
  });
}

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
  requestAnimationFrame(() => {
    appContainer.classList.toggle("focus", newState);
    setTheme(
      document.documentElement.getAttribute("data-theme") as Exclude<
        Theme,
        "system"
      >,
      newState,
    ).catch((err) => {
      console.error(
        "[initFocusMode -> setTheme]: Failed to sync theme with main process.",
        err,
      );
    });
  });
}

function toggleToolbar() {
  const appContainer = getAppItem("appContainer");
  const newState = !appContainer.classList.contains("toolbar-collapsed");
  appContainer.classList.toggle("toolbar-collapsed", newState);
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

function createAllTagsMenu() {
  const button = document.createElement("button");
  button.className = "all-tags-btn";
  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", "tag");
  button.appendChild(icon);
  const popover = document.createElement("div");
  popover.className = "tags-popover";
  const content = document.createElement("div");
  content.className = "tags-popover-content";
  const span = document.createElement("span");
  span.className = "info-span tags-popover-title";
  span.textContent = "All Tags";
  popover.append(span, content);
  content.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const clickedTag = target?.closest(".tag-node") as HTMLElement | null;
    const tagId = clickedTag?.getAttribute("data-tag");
    if (clickedTag && tagId) {
      const searchInput = requireElement<HTMLInputElement>(".search-input");
      searchInput.value = `#${tagId}`;
      searchInput.focus();
      handleSearchInput(tagId);
      return;
    }
  });
  const instance = tippy(button, {
    content: popover,
    trigger: "click",
    interactive: true,
    theme: "popover-theme",
    appendTo: () => document.body,
  });
  initTippyDelegate(popover, popover, "auto", false);
  renderIcons(button);
  return { button, popover, content, tippy: instance };
}

function renderAllTagsButton(container: HTMLElement, tags: string[]) {
  const menu = allTagsMenu ?? (allTagsMenu = createAllTagsMenu());
  const frag = document.createDocumentFragment();
  for (const tag of [...new Set(tags)]) {
    const item = document.createElement("span");
    item.className = "tags-popover-item tag-node";
    item.setAttribute("data-tippy-content", `#${tag}`);
    item.dataset["tag"] = tag;
    item.textContent = `#${tag}`;
    frag.appendChild(item);
  }
  menu.content.replaceChildren(frag);
  if (menu.button.parentElement !== container) {
    container.appendChild(menu.button);
  }
}

function renderTags(container: HTMLDivElement) {
  const activeTags = noteStore.get("activeNote")?.tags;
  const id = stateStore.get("activeId");
  container.replaceChildren();
  const tagMap = new Map<string, number>();
  const tagArr = noteStore
    .get("notes")
    .filter((n) => n.id !== id)
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
    const span = document.createElement("span");
    span.textContent =
      "No tags here. Create your first tag by writing #tag + Space";
    span.classList.add("info-span");
    container.appendChild(span);
    const allTags = noteStore.get("notes").flatMap((n) => n.tags);
    renderAllTagsButton(container, allTags);
    return;
  }
  for (const [item, count] of sortedTags) {
    createTagElement(container, item, count);
  }
  const allTags = noteStore.get("notes").flatMap((n) => n.tags);
  renderAllTagsButton(container, allTags);
}

function renderLinks(container: HTMLDivElement) {
  const activeNote = noteStore.get("activeNote");
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

const TOP_TOOLBAR_ACTIONS: ActionMap = {
  readOnly: {
    type: "action",
    run: (editor) => editor?.setEditable(!editor.isEditable),
    icon: "glasses",
    shortcut: "MOD+Shift+R",
  },
  editorWidth: {
    type: "action",
    run: () => {
      const appContainer = getAppItem("appContainer");
      setEditorWidth(appContainer);
    },
    icon: "ruler-dimension-line",
    shortcut: "MOD+Shift+W",
  },
  focus: {
    type: "action",
    run: () => initFocusMode(),
    icon: "focus",
    shortcut: "F11",
  },
  toggleToolbar: {
    type: "action",
    run: () => toggleToolbar(),
    icon: "arrow-down-from-line",
    shortcut: "MOD+Shift+T",
  },
};

//-------------------------------------------------------------

// editor toolbar

const TOOLBAR_ACTIONS: ActionMap = {
  toggleSidebar: {
    run: () => document.dispatchEvent(new CustomEvent("app:toggle-sidebar")),
    icon: "arrow-left-from-line",
    shortcut: "MOD+O",
  },
  undo: {
    run: (editor) => editor?.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
    icon: "undo2",
    shortcut: "MOD+Z",
  },
  redo: {
    run: (editor) => editor?.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
    icon: "redo2",
    shortcut: "MOD+Shift+Z",
  },
  tags: {
    run: () => {
      const container = openMetadataContainer();
      renderTags(container);
    },
    icon: "tag",
    shortcut: "#tag + Space",
  },
  wikilinks: {
    run: () => {
      const container = openMetadataContainer();
      renderLinks(container);
    },
    icon: "git-compare-arrows",
    shortcut: "[[Note]]",
  },
  divider1: { type: "divider" },
  bold: {
    run: (editor) => editor?.chain().focus().toggleBold().run(),
    isActive: (editor) => editor?.isActive("bold"),
    icon: "bold",
    shortcut: "Mod+B | **text**",
  },
  italic: {
    run: (editor) => editor?.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor?.isActive("italic"),
    icon: "italic",
    shortcut: "MOD+I | *text*",
  },
  strike: {
    run: (editor) => editor?.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor?.isActive("strike"),
    icon: "strikethrough",
    shortcut: "MOD+Shift+X | ~~text~~",
  },
  underline: {
    run: (editor) => editor?.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor?.isActive("underline"),
    icon: "underline",
    shortcut: "MOD+U | ++text++",
  },
  highlight: {
    run: (editor) => editor?.chain().focus().toggleHighlight().run(),
    isActive: (editor) => editor?.isActive("highlight"),
    icon: "highlighter",
    shortcut: "MOD+Shift+H | ==text==",
  },
  annotation: {
    run: (editor) => editor?.chain().focus().toggleAnnotation().run(),
    isActive: (editor) => editor?.isActive("annotation"),
    icon: "sticky-note",
    shortcut: "MOD+Shift+A | //text//",
  },
  divider2: { type: "divider" },
  heading1: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 1 }),
    icon: "heading-1",
    shortcut: "MOD+Alt+1 | # + Space",
  },
  heading2: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 2 }),
    icon: "heading-2",
    shortcut: "MOD+Alt+2 | ## + Space",
  },
  heading3: {
    run: (editor) => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor?.isActive("heading", { level: 3 }),
    icon: "heading-3",
    shortcut: "MOD+Alt+3 | ### + Space",
  },
  divider3: { type: "divider" },
  details: {
    run: (editor) => editor?.chain().focus().insertDetailsBlock().run(),
    isActive: (editor) => editor?.isActive("detailsBlock"),
    icon: "list-collapse",
    shortcut: "MOD+Shift+D",
  },
  bulletList: {
    run: (editor) => editor?.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor?.isActive("bulletList"),
    icon: "list",
    shortcut: "MOD+Shift+8 | - + Space",
  },
  orderedList: {
    run: (editor) => editor?.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor?.isActive("orderedList"),
    icon: "list-ordered",
    shortcut: "MOD+Shift+7 | 1. + Space",
  },
  taskList: {
    run: (editor) => editor?.chain().focus().toggleTaskList().run(),
    isActive: (editor) => editor?.isActive("taskList"),
    icon: "list-todo",
    shortcut: "MOD+Shift+9 | [] + Space",
  },
  blockQuote: {
    run: (editor) => editor?.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor?.isActive("blockquote"),
    icon: "text-quote",
    shortcut: "MOD+Shift+B | > + Space",
  },
  divider4: { type: "divider" },
  inlineCode: {
    run: (editor) => editor?.chain().focus().toggleCode().run(),
    isActive: (editor) => editor?.isActive("code"),
    icon: "code",
    shortcut: "MOD+E | `code`",
  },
  codeBlock: {
    run: (editor) => editor?.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor?.isActive("codeBlock"),
    icon: "code-xml",
    shortcut: "MOD+Alt+C | ``` + Space",
  },
  horizontalRule: {
    run: (editor) => editor?.chain().focus().setHorizontalRule().run(),
    isActive: (editor) => editor?.isActive("hr"),
    icon: "separator-horizontal",
    shortcut: "MOD+Shift+- | ---",
  },
  divider5: { type: "divider" },
  link: {
    run: (editor) => {
      if (!editor) return false;
      if (editor.isActive("link")) {
        return editor.chain().focus().extendMarkRange("link").unsetLink().run();
      }
      return editor.chain().focus().setLink({ href: "" }).run();
    },
    isActive: (editor) => editor?.isActive("link"),
    icon: "link",
    shortcut: "MOD+K / Open: MOD+Alt+Enter",
  },
  image: {
    run: (editor) => editor && promptImageUpload(editor),
    isActive: (editor) => editor?.isActive("image"),
    icon: "image",
    shortcut: "MOD+Alt+I",
  },
  table: {
    run: (editor) =>
      editor
        ?.chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
    isActive: (editor) => editor?.isActive("table"),
    icon: "grid-2x2",
    shortcut: "MOD+Alt+T",
  },
};

export {
  initTopToolbar,
  renderLinks,
  renderTags,
  TOOLBAR_ACTIONS,
  TOP_TOOLBAR_ACTIONS,
};

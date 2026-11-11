import { editorCommands } from "@/components/editor/editor-commands";
import { truncateTitle } from "@/components/editor/editor-generators";
import type { QuickSwitchState } from "@/components/quick-switch/quick-switch-init";
import {
  applyView,
  restoreSidebarScope,
} from "@/components/sidebar/sidebar-views";
import { handleCreateNote, handleSelectNote } from "@/notes/note-actions";
import { EXPORT_KEYS } from "@/settings/setting-actions";
import { settingsCommands } from "@/settings/settings-commands";
import { settingsStore, stateStore } from "@/state/state";
import { UNTAGGED } from "@/utils/constants";
import { useCore, useDialog } from "@/utils/registry";
import type { QuickSwitchDisplayBadge } from "@/utils/types";
import {
  createGlobalSpinner,
  createInfoSpan,
  createTooltipContent,
} from "@/utils/ui";
import type { Id } from "@shared/schemas/note-schema";

const PAD = 10;

function getSectionLabel(
  section: QuickSwitchDisplayBadge["section"],
  count: Record<QuickSwitchDisplayBadge["section"], number>,
) {
  switch (section) {
    case "recent":
      return `Recent (${count.recent})`;
    case "backlink":
      return `Backlinks (${count.backlink})`;
    case "outgoing":
      return `Links (${count.outgoing})`;
    case "related":
      return `Related (${count.related})`;
    case "search":
      return `Matching (${count.search})`;
    case "command":
      return `Commands (${count.command})`;
    case "setting":
      return `Settings (${count.setting})`;
    case "tag":
      return `Tags (${count.tag})`;
    case "create":
      return `Create new note`;
    case "wikilink":
      return `Link note`;
    case "fulltext":
      return `Full-text matches`;
    default:
      section satisfies never;
      return "";
  }
}

function getSectionCount(qsState: QuickSwitchState) {
  const count = qsState.currentDisplayNotes.reduce(
    (acc, note) => {
      acc[note.section] = (acc[note.section] ?? 0) + 1;
      return acc;
    },
    {} as Record<QuickSwitchDisplayBadge["section"], number>,
  );
  return count;
}

function renderTitleList(qsState: QuickSwitchState) {
  const { switchListEl } = useDialog("switchListEl");
  switchListEl.replaceChildren();
  if (qsState.currentDisplayNotes.length === 0) {
    switchListEl.appendChild(
      createInfoSpan("Nothing to display.", "quick-switch-empty"),
    );
    return;
  }
  const activeId = stateStore.get("activeId") as Id | null;
  let lastSection: QuickSwitchDisplayBadge["section"] | null = null;
  for (const [index, item] of qsState.currentDisplayNotes.entries()) {
    if (item.section !== lastSection) {
      switchListEl.appendChild(createSectionHeader(item.section, qsState));
      lastSection = item.section;
    }
    switchListEl.appendChild(
      createOptionEl(item, index, qsState.activeIndex, activeId),
    );
  }
}

function createSectionHeader(
  section: QuickSwitchDisplayBadge["section"],
  qsState: QuickSwitchState,
) {
  const header = document.createElement("div");
  header.className = "quick-switch-section-header";
  header.textContent = getSectionLabel(section, getSectionCount(qsState));
  return header;
}

function createOptionEl(
  item: QuickSwitchDisplayBadge,
  index: number,
  activeIndex: number,
  activeId: Id | null,
) {
  const element = document.createElement("div");
  element.className = "quick-switch-item";
  if (index === activeIndex) element.classList.add("active");
  element.dataset["index"] = String(index);
  element.title = item.title;
  element.appendChild(createInfoSpan(createTooltipContent(item.title)));
  const isActive = "isActive" in item && Boolean(item.isActive);
  if (isActive) element.classList.add("is-command-active");
  if (item.section === "fulltext") {
    element.classList.add("has-snippet");
    const snippetEl = document.createElement("span");
    snippetEl.className = "quick-switch-item-snippet";
    snippetEl.innerHTML = item.snippet;
    element.appendChild(snippetEl);
  }
  if (item.section === "tag") {
    const label = isActive ? ` ${item.count} ✓ ` : String(item.count);
    element.appendChild(createInfoSpan(label, "quick-switch-command-badge"));
  } else if (isActive) {
    element.appendChild(createInfoSpan(" ✓ ", "quick-switch-command-badge"));
  }
  element.toggleAttribute(
    "disabled",
    (item.section === "command" ||
      ("commandKey" in item && EXPORT_KEYS.includes(item.commandKey))) &&
      !activeId,
  );
  return element;
}

async function selectActive(
  qsState: QuickSwitchState,
  event?: KeyboardEvent | MouseEvent,
) {
  const { switchDialog } = useDialog("switchDialog");
  const selected = qsState.currentDisplayNotes[qsState.activeIndex];
  if (!selected) return;
  switchDialog.close();
  const section = selected.section;
  switch (section) {
    case "command": {
      const { editor } = useCore("editor");
      if (!stateStore.get("activeId")) return;
      editorCommands[selected.commandKey]?.run(editor);
      return;
    }
    case "setting": {
      settingsCommands[selected.commandKey]?.run();
      return;
    }
    case "tag": {
      const activeTag = settingsStore.get("active_tag");
      const clickedTag =
        selected.title === "Untagged" ? UNTAGGED : selected.title;
      const isNew = selected.count === 0 && clickedTag !== UNTAGGED;
      if ((isNew || event?.shiftKey) && clickedTag !== UNTAGGED) {
        const { editor } = useCore("editor");
        if (!editor || !editor.isEditable || editor.isActive("codeBlock"))
          return;
        const normalized = selected.title.replace(/[#\s]+/g, "").toLowerCase();
        if (!normalized) return;
        const pos = editor.state.selection.to;
        editor
          .chain()
          .focus()
          .insertNoteTag({ from: pos, to: pos, id: normalized })
          .run();
        return;
      }
      if (activeTag === clickedTag) {
        await applyView(null);
      } else {
        await applyView(clickedTag);
      }
      return;
    }
    case "wikilink": {
      const { editor } = useCore("editor");
      if (!editor || !editor.isEditable || editor.isActive("codeBlock")) return;
      const normalizedTitle = selected.title.replace(/[\[\]]/g, "").trim();
      if (!normalizedTitle) return;
      const pos = editor.state.selection.to;
      editor
        .chain()
        .focus()
        .insertWikiLink({
          from: pos,
          to: pos,
          id: selected.id,
          title: normalizedTitle,
        })
        .run();
      return;
    }
    case "create": {
      const rawTitle = selected.title.trim();
      if (!rawTitle) return;
      const { editor } = useCore("editor");
      await handleCreateNote({
        activeTitle: truncateTitle(rawTitle),
        shouldNavigate: true,
      });
      editor.commands.focus();
      restoreSidebarScope();
      return;
    }
    case "search":
    case "recent":
    case "backlink":
    case "outgoing":
    case "related": {
      if (event?.shiftKey) {
        const { switchListSearchInput } = useDialog("switchListSearchInput");
        const { editor } = useCore("editor");
        const rawTitle = switchListSearchInput.value.trim();
        if (!rawTitle) return;
        await handleCreateNote({
          activeTitle: truncateTitle(rawTitle),
          shouldNavigate: true,
        });
        editor.commands.focus();
        restoreSidebarScope();
        return;
      }
      if (stateStore.get("activeId") === selected.id) return;
      const loading = createGlobalSpinner();
      await loading.wrap(() => handleSelectNote(selected.id));
      restoreSidebarScope();
      return;
    }
    case "fulltext": {
      if (stateStore.get("activeId") !== selected.id) {
        const loading = createGlobalSpinner();
        await loading.wrap(() =>
          handleSelectNote(selected.id, { snippet: selected.snippet }),
        );
      }
      restoreSidebarScope();
      return;
    }
    default:
      section satisfies never;
      return "";
  }
}

function scrollItemIntoView(list: HTMLDivElement, item: HTMLDivElement) {
  const itemTop = item.offsetTop;
  const itemBottom = itemTop + item.offsetHeight;
  const viewTop = list.scrollTop;
  const viewBottom = viewTop + list.clientHeight;
  let target = viewTop;
  if (itemTop < viewTop + PAD) {
    target = Math.max(0, itemTop - PAD);
  } else if (itemBottom > viewBottom - PAD) {
    target = itemBottom - PAD - list.clientHeight;
  }
  // header is first element
  if (item === list.children[1]) {
    list.scrollTop = 0;
    return;
  }
  list.scrollTo({ top: target, behavior: "auto" });
}

function updateSelection(qsState: QuickSwitchState) {
  const { switchListEl } = useDialog("switchListEl");
  const items = [
    ...switchListEl.querySelectorAll<HTMLDivElement>(".quick-switch-item"),
  ];
  for (const [index, item] of items.entries()) {
    const isActive = index === qsState.activeIndex;
    item.classList.toggle("active", isActive);
    if (isActive) {
      scrollItemIntoView(switchListEl, item);
    }
  }
}

async function setDisplay(
  notes: readonly QuickSwitchDisplayBadge[],
  qsState: QuickSwitchState,
) {
  qsState.currentDisplayNotes = [...notes];
  qsState.activeIndex = 0;
  renderTitleList(qsState);
}

export { selectActive, setDisplay, updateSelection };

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
    const span = createInfoSpan("Nothing to display.", "quick-switch-empty");
    switchListEl.appendChild(span);
    return;
  }
  let lastSection: QuickSwitchDisplayBadge["section"] | null = null;
  const count = getSectionCount(qsState);
  const activeId = stateStore.get("activeId") as Id | null;
  for (const [index, item] of qsState.currentDisplayNotes.entries()) {
    if (item.section !== lastSection) {
      const header = document.createElement("div");
      header.className = "quick-switch-section-header";
      header.textContent = getSectionLabel(item.section, count);
      switchListEl.appendChild(header);
      lastSection = item.section;
    }
    const optionEl = document.createElement("div");
    optionEl.className =
      index === qsState.activeIndex
        ? "quick-switch-item active"
        : "quick-switch-item";
    optionEl.dataset["index"] = String(index);
    const transformed = createTooltipContent(item.title);
    const titleEl = createInfoSpan(transformed);
    optionEl.appendChild(titleEl);
    optionEl.title = item.title;
    const isActive = "isActive" in item && Boolean(item.isActive);
    if (isActive) {
      optionEl.classList.add("is-command-active");
    }
    if (item.section === "tag") {
      const label = isActive ? ` ${item.count} ✓ ` : String(item.count);
      optionEl.appendChild(createInfoSpan(label, "quick-switch-command-badge"));
    } else if (isActive) {
      optionEl.appendChild(createInfoSpan(" ✓ ", "quick-switch-command-badge"));
    }
    optionEl.toggleAttribute(
      "disabled",
      (item.section === "command" ||
        ("commandKey" in item && EXPORT_KEYS.includes(item.commandKey))) &&
        !activeId,
    );
    switchListEl.appendChild(optionEl);
  }
}

async function selectActive(qsState: QuickSwitchState) {
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
    case "create": {
      await handleCreateNote({
        activeTitle: truncateTitle(selected.title),
        shouldNavigate: true,
      });
      restoreSidebarScope();
      return;
    }
    case "tag": {
      const activeTag = settingsStore.get("active_tag");
      const clickedTag =
        selected.title === "Untagged" ? UNTAGGED : selected.title;
      if (activeTag === clickedTag) {
        await applyView(null);
      } else {
        await applyView(clickedTag);
      }
      return;
    }
    case "search":
    case "recent":
    case "backlink":
    case "outgoing":
    case "related": {
      if (stateStore.get("activeId") === selected.id) return;
      const loading = createGlobalSpinner();
      await loading.wrap(() => handleSelectNote(selected.id));
      restoreSidebarScope();
      return;
    }
    default:
      section satisfies never;
      return "";
  }
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
      item.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
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

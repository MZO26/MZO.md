import { initListeners } from "@/api/callbacks";
import {
  initEditor,
  setupEditorListeners,
} from "@/components/editor/editor-init";
import { initInfoSidebar } from "@/components/sidebar/info-sidebar-init";
import { reloadNoteList } from "@/components/sidebar/sidebar-actions";
import { initNotesSidebar } from "@/components/sidebar/sidebar-init";
import { topToolbarActions } from "@/components/toolbar/hoverbar-actions";
import { initHoverbar } from "@/components/toolbar/hoverbar-init";
import {
  buildMenu,
  setupToolbarListeners,
} from "@/components/toolbar/menu-builder";
import { ToolbarActions } from "@/components/toolbar/toolbar-actions";
import { loadSettings } from "@/settings/app-state";
import { initAppSettings } from "@/settings/setting-init";
import { initGlobalShortcuts } from "@/settings/shortcuts";
import { startAppClock } from "@/utils/date";
import { requireElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { getAppItem, setAppItems } from "@/utils/registry";
import "tippy.js/dist/tippy.css";
import { initTippyDelegate } from "./utils/ui";

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();
  setAppItems({
    appContainer: requireElement<HTMLDivElement>(".app-container"),
    sidebar: requireElement<HTMLDivElement>(".notes-container"),
    editor: initEditor(settings["spellcheck"]),
    editorWrapper: requireElement<HTMLDivElement>("#editor"),
    editorContainer: requireElement<HTMLDivElement>(".editor-container"),
  });
  setupEditorListeners(getAppItem("editorWrapper"), getAppItem("editor"));
  initGlobalShortcuts();
  initAppSettings(settings);
  initListeners();
  initNotesSidebar();
  initInfoSidebar();
  await reloadNoteList();
  const toolbarContainer = requireElement<HTMLDivElement>("#toolbar");
  buildMenu(toolbarContainer, ToolbarActions);
  setupToolbarListeners(toolbarContainer, ToolbarActions);
  const hoverbar = requireElement<HTMLDivElement>(".top-toolbar");
  buildMenu(hoverbar, topToolbarActions);
  setupToolbarListeners(hoverbar, topToolbarActions);
  initTippyDelegate(getAppItem("editorContainer"));
  initHoverbar();
  renderIcons();
  startAppClock();
  requestAnimationFrame(() => {
    window.electronAPI.startupReady();
  });
});

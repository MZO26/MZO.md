import { initListeners } from "@/api/listeners";
import { initEditor } from "@/components/editor/editor-init";
import { initInfoSidebar } from "@/components/sidebar/info-sidebar-init";
import { reloadNoteList } from "@/components/sidebar/sidebar-actions";
import { initSearchHandlers } from "@/components/sidebar/sidebar-filter-init";
import { initNotesSidebar } from "@/components/sidebar/sidebar-init";
import { topToolbarActions } from "@/components/toolbar/hoverbar-actions";
import { initHoverbar } from "@/components/toolbar/hoverbar-init";
import {
  buildMenu,
  setupToolbarListeners,
} from "@/components/toolbar/menu-builder";
import { ToolbarActions } from "@/components/toolbar/toolbar-actions";
import { initAppSettings, loadSettings } from "@/settings/setting-init";
import { initGlobalShortcuts } from "@/settings/shortcuts";
import { startAppClock } from "@/utils/date";
import { requireElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { setItems } from "@/utils/registry";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

document.addEventListener("DOMContentLoaded", async () => {
  setItems({
    appContainer: requireElement<HTMLDivElement>(".app-container"),
    sidebar: requireElement<HTMLDivElement>(".notes-container"),
    editor: initEditor(),
    editorWrapper: requireElement<HTMLDivElement>("#editor"),
  });
  const settings = await loadSettings();
  initGlobalShortcuts();
  initAppSettings(settings);
  initListeners();
  await reloadNoteList();
  initNotesSidebar(settings["note-sidebar-state"]);
  initInfoSidebar(settings["info-sidebar-state"]);
  const toolbarContainer = requireElement("#toolbar");
  buildMenu(toolbarContainer, ToolbarActions);
  setupToolbarListeners(toolbarContainer, ToolbarActions);
  const hoverbar = requireElement(".top-toolbar");
  buildMenu(hoverbar, topToolbarActions);
  setupToolbarListeners(hoverbar, topToolbarActions);
  initHoverbar();
  initSearchHandlers();
  renderIcons();
  tippy("[data-tippy-content]", {
    placement: "top",
    theme: "app-theme",
  });
  startAppClock();
});

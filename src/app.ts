import { initListeners } from "@/api/listeners";
import { initEditor } from "@/components/editor/editor-init";
import { initInfoSidebar } from "@/components/sidebar/info-sidebar-init";
import { reloadNoteList } from "@/components/sidebar/sidebar-actions";
import { initSearchHandlers } from "@/components/sidebar/sidebar-filter-init";
import { initNotesSidebar } from "@/components/sidebar/sidebar-init";
import { topToolbarActions } from "@/components/toolbar/hoverbar-actions";
import { initHoverbar } from "@/components/toolbar/hoverbar-builder";
import {
  buildMenu,
  setupToolbarListeners,
} from "@/components/toolbar/menu-builder";
import { ToolbarActions } from "@/components/toolbar/toolbar-actions";
import { initAppSettings } from "@/settings/setting-init";
import { initGlobalShortcuts } from "@/settings/shortcuts";
import { updateDateTime } from "@/utils/date";
import { getElement } from "@/utils/helpers";
import tippy, { delegate } from "tippy.js";
import "tippy.js/dist/tippy.css";
import { renderIcons } from "./utils/icons";

document.addEventListener("DOMContentLoaded", async () => {
  const editor = initEditor("#editor");
  initGlobalShortcuts();
  initAppSettings();
  initListeners();
  await reloadNoteList();
  initNotesSidebar();
  initInfoSidebar();
  updateDateTime();
  const toolbarContainer = getElement("#toolbar");
  buildMenu(toolbarContainer, editor, ToolbarActions);
  setupToolbarListeners(toolbarContainer, ToolbarActions, editor);
  const hoverbar = getElement(".top-toolbar");
  buildMenu(hoverbar, editor, topToolbarActions);
  setupToolbarListeners(hoverbar, topToolbarActions, editor);
  initHoverbar();
  initSearchHandlers();
  renderIcons();
  tippy("[data-tippy-content]", {
    placement: "top",
    theme: "app-theme",
  });

  delegate(".notes-container", {
    target: "[tippy-content]",
    theme: "app-theme",
    content: (reference) =>
      reference.getAttribute("tippy-content") || "options",
  });
});

setInterval(updateDateTime, 60000);

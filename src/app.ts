import { initListeners } from "@/api/callbacks";
import { setupEditorListeners } from "@/components/editor/editor-init";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { initNotesSidebar } from "@/components/sidebar/sidebar-init";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-ui";
import {
  buildMenu,
  setupToolbarListeners,
} from "@/components/toolbar/toolbar-factory";
import {
  initTopToolbar,
  TOOLBAR_ACTIONS,
  TOP_TOOLBAR_ACTIONS,
} from "@/components/toolbar/toolbar-features";
import { loadSettings, syncNoteStore } from "@/settings/app-state";
import { initAppSettings } from "@/settings/setting-init";
import { startAppClock } from "@/utils/date";
import { requireElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import {
  getAppItem,
  initializeCoreRegistry,
  initializeTemplateRegistry,
  initializeUIRegistry,
} from "@/utils/registry";
import { initGlobalShortcuts } from "@/utils/shortcuts";
import { initTippyDelegate } from "@/utils/ui";

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();
  initializeCoreRegistry(settings);
  initializeTemplateRegistry();
  initializeUIRegistry();
  setupEditorListeners(getAppItem("editorWrapper"), getAppItem("editor"));
  initGlobalShortcuts();
  await initAppSettings(settings);
  initListeners();
  initNotesSidebar();
  await syncNoteStore();
  handleSidebarEmptyState();
  handleEditorEmptyState();
  const toolbarContainer = requireElement<HTMLDivElement>(
    "#toolbar",
    getAppItem("editorContainer"),
  );
  buildMenu(toolbarContainer, TOOLBAR_ACTIONS);
  setupToolbarListeners(toolbarContainer, TOOLBAR_ACTIONS);
  const topToolbar = requireElement<HTMLDivElement>(".top-toolbar");
  buildMenu(topToolbar, TOP_TOOLBAR_ACTIONS);
  setupToolbarListeners(topToolbar, TOP_TOOLBAR_ACTIONS);
  initTopToolbar();
  renderIcons();
  startAppClock();
  initTippyDelegate(getAppItem("editorContainer"));
  initTippyDelegate(topToolbar, getAppItem("appContainer"));
  requestAnimationFrame(() => {
    window.electronAPI.startupReady();
  });
});

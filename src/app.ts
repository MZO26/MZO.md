import { initListeners } from "@/api/callbacks";
import { initEditorSearch } from "@/components/editor/editor-features";
import { setupEditorListeners } from "@/components/editor/editor-init";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { initQuickSwitcher } from "@/components/quick-switch/quick-switch";
import { initNotesSidebar } from "@/components/sidebar/sidebar-init";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-ui";
import {
  buildToolbarMenu,
  buildTopToolbarMenu,
  setupToolbarListeners,
} from "@/components/toolbar/toolbar-factory";
import {
  initMetadataToolbar,
  initTopToolbar,
  setToolbarCollapsed,
  TOOLBAR_ACTIONS,
  TOP_TOOLBAR_ACTIONS,
} from "@/components/toolbar/toolbar-features";
import { loadSettings, stateStore, syncNoteStore } from "@/settings/app-state";
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
  const appContainer = getAppItem("appContainer");
  const editor = getAppItem("editor");
  const editorWrapper = getAppItem("editorWrapper");
  const editorContainer = getAppItem("editorContainer");
  const toolbarContainer = requireElement<HTMLDivElement>(
    "#toolbar",
    editorContainer,
  );
  const topToolbar = requireElement<HTMLDivElement>(".top-toolbar");
  setupEditorListeners(editorWrapper, editor);
  await initAppSettings(settings);
  initListeners();
  buildToolbarMenu(toolbarContainer, TOOLBAR_ACTIONS);
  setupToolbarListeners(toolbarContainer, TOOLBAR_ACTIONS);
  buildTopToolbarMenu(topToolbar, TOP_TOOLBAR_ACTIONS);
  setupToolbarListeners(topToolbar, TOP_TOOLBAR_ACTIONS);
  initTopToolbar();
  initMetadataToolbar();
  renderIcons();
  startAppClock();
  initGlobalShortcuts();
  initTippyDelegate(editorContainer);
  initTippyDelegate(topToolbar, appContainer);
  await syncNoteStore();
  initNotesSidebar();
  initQuickSwitcher();
  initEditorSearch(editor);
  handleSidebarEmptyState();
  handleEditorEmptyState(stateStore.getState().activeId);
  if (settings["toolbar_collapsed"] === true) {
    await setToolbarCollapsed(true);
  }
});

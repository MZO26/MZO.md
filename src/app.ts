import { initListeners } from "@/api/callbacks";
import { initEditorSearch } from "@/components/editor/editor-features";
import { setupEditorListeners } from "@/components/editor/editor-init";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { initQuickSwitcher } from "@/components/quick-switch/quick-switch";
import { initNotesSidebar } from "@/components/sidebar/sidebar-init";
import { handleSidebarEmptyState } from "@/components/sidebar/sidebar-ui";
import { setToolbarCollapsed } from "@/components/toolbar/toolbar-features";
import {
  initMetadataToolbar,
  initToolbar,
  initTopToolbar,
} from "@/components/toolbar/toolbar-init";
import { loadSettings, stateStore, syncNoteStore } from "@/settings/app-state";
import { initAppSettings } from "@/settings/setting-init";
import { startAppClock } from "@/utils/date";
import { renderIcons } from "@/utils/icons";
import {
  getAppItem,
  initializeCoreRegistry,
  initializeTemplateRegistry,
  initializeUIRegistry,
} from "@/utils/registry";
import { initGlobalShortcuts } from "@/utils/shortcuts";

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();
  initializeCoreRegistry(settings);
  initializeTemplateRegistry();
  initializeUIRegistry();
  const editor = getAppItem("editor");
  const editorWrapper = getAppItem("editorWrapper");
  setupEditorListeners(editorWrapper, editor);
  await initAppSettings(settings);
  initListeners();
  initToolbar();
  initTopToolbar();
  initMetadataToolbar();
  renderIcons();
  startAppClock();
  initGlobalShortcuts();
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

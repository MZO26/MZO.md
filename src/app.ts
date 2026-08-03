import { getAll, getAllSettings } from "@/api/api";
import { initListeners } from "@/api/callbacks";
import { setupEditorListeners } from "@/components/editor/editor-init";
import { handleEditorEmptyState } from "@/components/editor/editor-ui";
import { initQuickSwitcher } from "@/components/quick-switch/quick-switch-init";
import { initNotesSidebar } from "@/components/sidebar/sidebar-init";
import { handleSidebarChange } from "@/components/sidebar/sidebar-ui";
import { setToolbarCollapsed } from "@/components/toolbar/toolbar-features";
import {
  initMetadataToolbar,
  initToolbar,
  initTopToolbar,
} from "@/components/toolbar/toolbar-init";
import { initAppSettings } from "@/settings/setting-init";
import { stateStore } from "@/state/state";
import {
  getSidebarParams,
  syncNoteStore,
  syncSettingsStore,
} from "@/state/state-actions";
import "@/state/state-init";
import { startAppClock } from "@/utils/date";
import { renderIcons } from "@/utils/icons";
import {
  getAppItem,
  initializeCoreRegistry,
  initializeTemplateRegistry,
  initializeUIRegistry,
} from "@/utils/registry";
import { initGlobalShortcuts } from "@/utils/shortcuts";
import { createLogger } from "@shared/log";

export const rendererLogger = createLogger(import.meta.env.DEV);

async function initApp() {
  const notesResult = await getAll();
  const settingsResult = await getAllSettings();
  rendererLogger.time("DOM Loading Time");
  if (!notesResult.success) {
    rendererLogger.appError(
      "[getAll]: Failed to fetch all notes:",
      notesResult.error,
    );
    throw new Error(notesResult.error);
  }
  const settings = syncSettingsStore(settingsResult);
  syncNoteStore(notesResult.data);
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
  initNotesSidebar();
  initQuickSwitcher();
  handleSidebarChange(getSidebarParams());
  handleEditorEmptyState(stateStore.get("activeId"));
  if (settings["toolbar_collapsed"] === true) {
    setToolbarCollapsed(true);
  }
  rendererLogger.timeEnd("DOM Loading Time");
  rendererLogger.devLog("App started successfully");
}
await initApp();

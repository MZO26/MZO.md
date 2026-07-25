import { getAll, getAllSettings } from "@/api/api";
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
import { initAppSettings } from "@/settings/setting-init";
import { stateStore } from "@/state/state";
import { initSettings, syncNoteStore } from "@/state/state-init";
import { startAppClock } from "@/utils/date";
import { renderIcons } from "@/utils/icons";
import {
  getAppItem,
  initializeCoreRegistry,
  initializeTemplateRegistry,
  initializeUIRegistry,
} from "@/utils/registry";
import { initGlobalShortcuts } from "@/utils/shortcuts";

const notesPromise = getAll();
const settingsPromise = getAllSettings();

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    console.time("dom-loaded");
    const notesResult = await notesPromise;
    const settingsResult = await settingsPromise;
    if (!notesResult.success) {
      console.error("[getAll]: Failed to fetch all notes:", notesResult.error);
      throw new Error(notesResult.error);
    }
    const settings = initSettings(settingsResult);
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
    syncNoteStore(notesResult.data);
    initNotesSidebar();
    initQuickSwitcher();
    initEditorSearch(editor);
    handleSidebarEmptyState();
    handleEditorEmptyState(stateStore.get("activeId"));
    if (settings["toolbar_collapsed"] === true) {
      await setToolbarCollapsed(true);
    }
    console.timeEnd("dom-loaded");
  },
  { once: true },
);

import { getAll, getAllSettings } from "@/api/api";
import { initListeners } from "@/api/callbacks";
import { setupEditorListeners } from "@/components/editor/editor-init";
import { initEditorSearch } from "@/components/editor/editor-search";
import { initQuickSwitcher } from "@/components/quick-switch/quick-switch-init";
import { initNotesSidebar } from "@/components/sidebar/sidebar-init";
import { restoreSidebarScope } from "@/components/sidebar/sidebar-views";
import { initToolbar } from "@/components/toolbar/toolbar-init";
import { openInitialNote } from "@/notes/note-actions";
import { applySettings } from "@/settings/setting-actions";
import { initSubscriptions } from "@/state/state-init";
import { syncNoteStore, syncSettingsStore, syncStateStore } from "@/state/state-sync";
import { startAppClock } from "@/utils/date";
import { rendererLogger, withPerformanceLog } from "@/utils/helpers";
import { renderIcons } from "@/utils/icons";
import {
  initCoreRegistry,
  initDialogRegistry,
  initTemplateRegistry,
  initUIRegistry,
  useCore,
} from "@/utils/registry";
import { initGlobalShortcuts } from "@/utils/shortcuts";

async function initApp() {
  const notesResult = await getAll();
  const settingsResult = await getAllSettings();
  if (!notesResult.success) {
    rendererLogger.appError("[getAll]: Failed to fetch all notes:", notesResult.error);
    throw new Error(notesResult.error);
  }
  const settings = syncSettingsStore(settingsResult);
  initCoreRegistry(settings);
  initTemplateRegistry();
  initUIRegistry();
  initDialogRegistry();
  const { editor, editorWrapper, editorContainer, sidebar } = useCore(
    "editor",
    "editorWrapper",
    "editorContainer",
    "sidebar",
  );
  initSubscriptions(sidebar);
  syncStateStore(settingsResult);
  syncNoteStore(notesResult.data);
  setupEditorListeners(editorWrapper, editor);
  initEditorSearch(editorWrapper);
  initListeners();
  initToolbar(editorContainer);
  startAppClock();
  initGlobalShortcuts();
  initNotesSidebar(sidebar);
  initQuickSwitcher(editor);
  await applySettings(settings);
  renderIcons();
  await openInitialNote(notesResult.data);
  restoreSidebarScope();
}
await withPerformanceLog(initApp)();
rendererLogger.devLog("App started successfully");

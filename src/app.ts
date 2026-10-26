import { getAll, getAllSettings } from "@/api/api";
import { initListeners } from "@/api/callbacks";
import { setupEditorListeners } from "@/components/editor/editor-init";
import { initEditorSearch } from "@/components/editor/editor-search";
import { initQuickSwitcher } from "@/components/quick-switch/quick-switch-init";
import { initNotesSidebar } from "@/components/sidebar/sidebar-init";
import { restoreSidebarScope } from "@/components/sidebar/sidebar-views";
import { initToolbar, initTopToolbar } from "@/components/toolbar/toolbar-init";
import { handleSelectNote } from "@/notes/note-actions";
import { initAppSettings } from "@/settings/setting-init";
import { localStore } from "@/state/state";
import "@/state/state-init";
import { initSubscriptions } from "@/state/state-init";
import {
  syncNoteStore,
  syncSettingsStore,
  syncStateStore,
} from "@/state/state-sync";
import { startAppClock } from "@/utils/date";
import { withPerformanceLog } from "@/utils/helpers";
import { renderIcons } from "@/utils/icons";
import {
  initCoreRegistry,
  initDialogRegistry,
  initTemplateRegistry,
  initUIRegistry,
  useCore,
} from "@/utils/registry";
import { initGlobalShortcuts } from "@/utils/shortcuts";
import { createLogger } from "@shared/log";
import { isNoteID } from "@shared/schemas/note-schema";

export const rendererLogger = createLogger(import.meta.env.DEV);

async function initApp() {
  const notesResult = await getAll();
  const settingsResult = await getAllSettings();
  if (!notesResult.success) {
    rendererLogger.appError(
      "[getAll]: Failed to fetch all notes:",
      notesResult.error,
    );
    throw new Error(notesResult.error);
  }
  const settings = syncSettingsStore(settingsResult);
  initCoreRegistry(settings);
  initTemplateRegistry();
  initUIRegistry();
  initDialogRegistry();
  const { editor, editorWrapper, editorContainer, appContainer, sidebar } =
    useCore(
      "editor",
      "editorWrapper",
      "editorContainer",
      "appContainer",
      "sidebar",
    );
  initSubscriptions(sidebar);
  syncStateStore(settingsResult);
  syncNoteStore(notesResult.data);
  setupEditorListeners(editorWrapper, editor);
  initEditorSearch(editor, editorContainer, editorWrapper);
  await initAppSettings(settings);
  initListeners();
  initToolbar(editorContainer);
  initTopToolbar(appContainer);
  startAppClock();
  initGlobalShortcuts();
  initNotesSidebar(sidebar);
  initQuickSwitcher(editor);
  renderIcons();
  const lastOpenNoteId = localStore.get("lastOpenNote");
  if (
    isNoteID(lastOpenNoteId) &&
    notesResult.data.some((n) => n.id === lastOpenNoteId)
  )
    await handleSelectNote(lastOpenNoteId);
  restoreSidebarScope();
}
await withPerformanceLog(initApp)();
rendererLogger.devLog("App started successfully");

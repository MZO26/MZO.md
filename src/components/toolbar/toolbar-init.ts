import { applyTagView } from "@/components/sidebar/sidebar-features";
import {
  TOOLBAR_ACTIONS,
  TOP_TOOLBAR_ACTIONS,
} from "@/components/toolbar/toolbar-actions";
import {
  buildToolbarMenu,
  buildTopToolbarMenu,
  setupToolbarListeners,
} from "@/components/toolbar/toolbar-factory";
import {
  initFocusMode,
  setEditorWidth,
  setWindowTop,
  toggleToolbar,
} from "@/components/toolbar/toolbar-features";
import { handleSelectNote } from "@/notes/note-actions";
import { stateStore } from "@/settings/app-state";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { getAppItem, getUIItem, registerAppEvents } from "@/utils/registry";
import { createGlobalSpinner, initTippyDelegate } from "@/utils/ui";

let toolbarApi: { refresh: () => void } | null = null;

function initMetadataToolbar() {
  const metadataContainer = getUIItem("metadataContainer");
  metadataContainer.addEventListener(
    "click",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const clickedLink = target.closest<HTMLSpanElement>(".link");
      const linkId = clickedLink?.getAttribute("data-link");
      if (linkId === stateStore.get("activeId")) return;
      if (clickedLink && linkId) {
        const loading = createGlobalSpinner();
        await loading.wrap(async () => {
          await handleSelectNote(linkId);
        });
        return;
      }
      const clickedTag = target.closest<HTMLSpanElement>(".tag-node");
      const tagId = clickedTag?.getAttribute("data-tag");
      if (clickedTag && tagId) {
        applyTagView(tagId);
        return;
      }
    }),
  );
  const editorWrapper = getAppItem("editorWrapper");
  editorWrapper.addEventListener("focusin", () => {
    metadataContainer.classList.add("collapsed");
  });
}

function initToolbar() {
  const editorContainer = getAppItem("editorContainer");
  const toolbarContainer = requireElement<HTMLDivElement>("#toolbar");
  toolbarApi = buildToolbarMenu(toolbarContainer, TOOLBAR_ACTIONS);
  setupToolbarListeners(toolbarContainer, TOOLBAR_ACTIONS);
  initTippyDelegate(editorContainer);
}

function initTopToolbar() {
  const appContainer = getAppItem("appContainer");
  const appPinBtn = requireElement<HTMLButtonElement>(".app-pin-btn");
  const topToolbar = requireElement<HTMLDivElement>(".top-toolbar");
  buildTopToolbarMenu(topToolbar, TOP_TOOLBAR_ACTIONS);
  setupToolbarListeners(topToolbar, TOP_TOOLBAR_ACTIONS);
  initTippyDelegate(topToolbar, appContainer);
  appPinBtn.addEventListener(
    "click",
    createAsyncHandler(async () => setWindowTop(appPinBtn)),
  );
  registerAppEvents(document, {
    "app:set-editor-width": () => setEditorWidth(appContainer),
    "app:toggle-focus-mode": () => initFocusMode(),
    "app:exit-focus-mode": () => {
      if (appContainer.classList.contains("focus")) {
        initFocusMode();
      }
    },
    "app:toggle-toolbar": () => toggleToolbar(),
  });
}

export { initMetadataToolbar, initToolbar, initTopToolbar, toolbarApi };

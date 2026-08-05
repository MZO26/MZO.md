import { updateSettings } from "@/api/api";
import { applyView } from "@/components/sidebar/sidebar-views";
import {
  TOOLBAR_ACTIONS,
  TOP_TOOLBAR_ACTIONS,
} from "@/components/toolbar/toolbar-actions-init";
import {
  buildToolbarMenu,
  buildTopToolbarMenu,
  setupToolbarListeners,
} from "@/components/toolbar/toolbar-factory";
import {
  setEditorWidth,
  setWindowTop,
} from "@/components/toolbar/toolbar-features";
import { handleSelectNote } from "@/notes/note-actions";
import { settingsStore, stateStore } from "@/state/state";
import { createAsyncHandler } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { getAppItem, getUIItem, registerAppEvents } from "@/utils/registry";
import { isFocusActive } from "@/utils/shortcuts";
import { createGlobalSpinner } from "@/utils/ui";

function initMetadataToolbar() {
  const metadataContainer = getUIItem("metadataContainer");
  const editorWrapper = getAppItem("editorWrapper");
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
        const normalizedTag = tagId?.trim().toLowerCase();
        if (normalizedTag) await applyView(tagId);
        return;
      }
    }),
  );
  editorWrapper.addEventListener("focusin", () => {
    metadataContainer.classList.add("collapsed");
  });
}

function initToolbar() {
  const toolbarContainer = requireElement<HTMLDivElement>("#toolbar");
  buildToolbarMenu(toolbarContainer, TOOLBAR_ACTIONS);
  setupToolbarListeners(toolbarContainer, TOOLBAR_ACTIONS);
}

function initTopToolbar() {
  const appContainer = getAppItem("appContainer");
  const appPinBtn = requireElement<HTMLButtonElement>(".app-pin-btn");
  const topToolbar = requireElement<HTMLDivElement>(".top-toolbar");
  buildTopToolbarMenu(topToolbar, TOP_TOOLBAR_ACTIONS);
  setupToolbarListeners(topToolbar, TOP_TOOLBAR_ACTIONS);
  appPinBtn.addEventListener(
    "click",
    createAsyncHandler(async () => await setWindowTop(appPinBtn)),
  );
  registerAppEvents(document, {
    "app:set-editor-width": () => setEditorWidth(appContainer),
    "app:toggle-focus-mode": () => {
      const newState = !isFocusActive();
      stateStore.setState({ focus: newState });
    },
    "app:toggle-toolbar": () => {
      const newState = !settingsStore.get("toolbar_collapsed");
      updateSettings({ toolbar_collapsed: newState });
    },
  });
}

export { initMetadataToolbar, initToolbar, initTopToolbar };

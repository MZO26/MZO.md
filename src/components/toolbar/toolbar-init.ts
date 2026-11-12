import { TOOLBAR_ACTIONS } from "@/components/toolbar/toolbar-actions-init";
import {
  buildToolbarMenu,
  setupToolbarListeners,
} from "@/components/toolbar/toolbar-factory";
import { requireElement } from "@/utils/ui";

function initToolbar(editorContainer: HTMLDivElement) {
  const toolbarContainer = requireElement<HTMLDivElement>(
    "#toolbar",
    editorContainer,
  );
  buildToolbarMenu(toolbarContainer, TOOLBAR_ACTIONS);
  setupToolbarListeners(toolbarContainer, TOOLBAR_ACTIONS);
}

export { initToolbar };

import { pinWindow } from "@/api/api";
import { rendererLogger } from "@/app";
import { getAppItem } from "@/utils/registry";

function setEditorWidth(container: HTMLDivElement) {
  const widths = ["comfortable", "normal", "wide"];
  const current = container.getAttribute("data-width") || "normal";
  const index = widths.indexOf(current as (typeof widths)[number]);
  const next = widths[(index + 1) % widths.length];
  if (!next) return;
  container.setAttribute("data-width", next);
}

async function setWindowTop(toggleBtn: HTMLButtonElement) {
  const result = await pinWindow();
  if (!result.success) {
    rendererLogger.appError(
      "[setWindowTop]: Failed to pin window:",
      result.error,
    );
    return;
  }
  toggleBtn.classList.toggle("pin", result.data);
}

function setFocusMode(focus: boolean) {
  const appContainer = getAppItem("appContainer");
  appContainer.classList.toggle("focus", focus);
}

function setToolbarCollapsed(collapsed: boolean) {
  const appContainer = getAppItem("appContainer");
  appContainer.classList.toggle("toolbar-collapsed", collapsed);
}

export { setEditorWidth, setFocusMode, setToolbarCollapsed, setWindowTop };

import { pinWindow } from "@/api/api";
import { rendererLogger } from "@/app";
import { getAppItem } from "@/utils/registry";

const widths = ["comfortable", "normal", "wide"] as const;

function isValidWith(width: unknown): width is (typeof widths)[number] {
  return widths.some((w) => w === width);
}

function setEditorWidth(container: HTMLDivElement) {
  const current = container.getAttribute("data-width") || "normal";
  if (isValidWith(current)) {
    const index = widths.indexOf(current);
    const next = widths[(index + 1) % widths.length];
    if (!next) return;
    container.setAttribute("data-width", next);
  }
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

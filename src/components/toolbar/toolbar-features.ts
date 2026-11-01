import { pinWindow } from "@/api/api";
import { rendererLogger } from "@/utils/helpers";
import { useCore } from "@/utils/registry";

const widths = ["comfortable", "normal", "wide"] as const;

function setEditorWidth(container: HTMLDivElement) {
  const current = container.getAttribute("data-width") || "normal";
  const index = widths.indexOf(current as (typeof widths)[number]);
  if (index === -1) return;
  container.setAttribute(
    "data-width",
    widths[(index + 1) % widths.length] ?? "normal",
  );
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
  const { appContainer } = useCore("appContainer");
  appContainer.classList.toggle("focus", focus);
}

function setToolbarCollapsed(collapsed: boolean) {
  const { appContainer } = useCore("appContainer");
  appContainer.classList.toggle("toolbar-collapsed", collapsed);
}

export { setEditorWidth, setFocusMode, setToolbarCollapsed, setWindowTop };

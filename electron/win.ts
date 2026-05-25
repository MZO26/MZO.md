import { win } from "@electron/main";
import { store } from "@electron/store";
import { ZOOMS } from "@shared/constants";
import { validation } from "@shared/ipc-helpers";
import { StoreSchema } from "@shared/schemas/store-schema";
import type { ZoomAction } from "@shared/types";
import { BrowserWindow } from "electron";

function nextZoom(current: number, action: ZoomAction): number {
  if (action === "get") return current;
  if (action === "reset") return 1;
  let targetIndex: number;
  const index = ZOOMS.findIndex((z) => z >= current);
  const safeIndex = index === -1 ? ZOOMS.length - 1 : index;

  if (action === "in") {
    targetIndex = Math.min(safeIndex + 1, ZOOMS.length - 1);
  } else {
    targetIndex = Math.max(safeIndex - 1, 0);
  }
  return ZOOMS[targetIndex] ?? 1;
}

function saveWindowBounds() {
  if (!win || win.isDestroyed() || win.isMinimized()) {
    return;
  }
  try {
    const bounds =
      typeof win.getNormalBounds === "function"
        ? win.getNormalBounds()
        : win.getBounds();
    const preparedBounds = {
      x: bounds.x,
      y: bounds.y,
      width: Math.max(1100, bounds.width),
      height: Math.max(600, bounds.height),
    };
    const result = validation(
      StoreSchema.shape["window-bounds"],
      preparedBounds,
    );
    store.set("window-bounds", result);
  } catch (error) {
    console.error("[saveWindowBounds]: Failed to save window bounds:", error);
  }
}

const createHiddenPdfWindow = () => {
  const hiddenWin = new BrowserWindow({
    show: false,
    skipTaskbar: true,
    focusable: false,
    width: 1100,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: false,
    },
  });
  return hiddenWin;
};

export { createHiddenPdfWindow, nextZoom, saveWindowBounds };

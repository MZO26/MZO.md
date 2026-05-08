import { safeInvoke } from "@/utils/ipc";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type { Theme } from "@shared/schemas/store-schema";
import type { IpcResponse, ZoomAction } from "@shared/types";

async function getPlatform(): Promise<IpcResponse<string>> {
  return safeInvoke(window.electronAPI.platform());
}

async function setTheme(
  theme: Theme,
  focus?: boolean,
): Promise<IpcResponse<Theme>> {
  return safeInvoke(window.electronAPI.setTheme(theme, focus));
}

async function saveImage(
  payload: ImagePayload,
): Promise<IpcResponse<{ imageSrc: string }>> {
  return safeInvoke(window.electronAPI.saveImage(payload));
}

async function showContextMenu(
  id: string,
  pinned: boolean,
  bookmarked: boolean,
): Promise<IpcResponse<void>> {
  return safeInvoke(window.electronAPI.showContextMenu(id, pinned, bookmarked));
}

async function handleZoom(
  action: ZoomAction,
): Promise<IpcResponse<ZoomAction>> {
  return safeInvoke(window.electronAPI.zoom(action));
}

export { getPlatform, handleZoom, saveImage, setTheme, showContextMenu };

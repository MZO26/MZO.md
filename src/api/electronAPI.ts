import { safeIpcCall } from "@/utils/helpers";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type { Theme } from "@shared/schemas/store-schema";
import type { IpcResponse } from "@shared/types";

async function setTheme(
  theme: Theme,
  focus?: boolean,
): Promise<IpcResponse<Theme>> {
  return safeIpcCall(window.electronAPI.setTheme(theme, focus));
}

async function saveImage(
  payload: ImagePayload,
): Promise<IpcResponse<{ imageSrc: string }>> {
  return safeIpcCall(window.electronAPI.saveImage(payload));
}

async function showContextMenu(
  id: string,
  pinned: boolean,
  bookmarked: boolean,
): Promise<IpcResponse<void>> {
  return safeIpcCall(
    window.electronAPI.showContextMenu(id, pinned, bookmarked),
  );
}

export { saveImage, setTheme, showContextMenu };

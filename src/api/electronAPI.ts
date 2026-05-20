import { safeInvoke } from "@/utils/ipc";
import type { ImagePayload } from "@shared/schemas/image-schema";
import type { Theme } from "@shared/schemas/store-schema";
import type { Result, ZoomAction } from "@shared/types";

async function setTheme(theme: Theme, focus?: boolean): Promise<Result<Theme>> {
  return safeInvoke(window.electronAPI.setTheme(theme, focus));
}

async function saveImage(
  payload: ImagePayload,
): Promise<Result<{ imageSrc: string }>> {
  return safeInvoke(window.electronAPI.saveImage(payload));
}

async function handleZoom(action: ZoomAction): Promise<Result<ZoomAction>> {
  return safeInvoke(window.electronAPI.zoom(action));
}

export { handleZoom, saveImage, setTheme };

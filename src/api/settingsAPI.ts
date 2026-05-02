import { safeIpcCall } from "@/utils/helpers";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { IpcResponse } from "@shared/types";

async function getSettings<K extends keyof AppSettings>(
  key: K,
): Promise<IpcResponse<AppSettings[K]>> {
  return safeIpcCall(window.storeAPI.getSettings(key));
}

async function setSettings(
  settings: Partial<AppSettings>,
): Promise<IpcResponse<AppSettings>> {
  return safeIpcCall(window.storeAPI.setSettings(settings));
}

export { getSettings, setSettings };

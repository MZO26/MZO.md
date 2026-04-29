import type { AppSettings } from "../../shared/schemas/storeSchema";
import type { IpcResponse } from "../../shared/types";
import { safeIpcCall } from "../utils/helpers";

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

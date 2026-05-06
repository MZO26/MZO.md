import { debounce } from "@/utils/async";
import { safeIpcCall } from "@/utils/ipc";
import { showToast } from "@/utils/toast";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { IpcResponse } from "@shared/types";
async function getSettings<K extends keyof AppSettings>(
  key: K,
): Promise<IpcResponse<AppSettings[K]>> {
  return safeIpcCall(window.storeAPI.getSettings(key));
}

async function getAllSettings(): Promise<IpcResponse<AppSettings>> {
  return safeIpcCall(window.storeAPI.getAllSettings());
}

async function setSettings(
  settings: Partial<AppSettings>,
): Promise<IpcResponse<AppSettings>> {
  return safeIpcCall(window.storeAPI.setSettings(settings));
}

const debouncedSetSettings = debounce(
  async (settings: Partial<AppSettings>) => {
    try {
      const response = await setSettings(settings);
      if (!response.success) {
        showToast(response.message);
      }
    } catch (err) {
      console.error(err);
    }
  },
  1000,
);

export { debouncedSetSettings, getAllSettings, getSettings };

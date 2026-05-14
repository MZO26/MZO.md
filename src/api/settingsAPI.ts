import { settingsStore } from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { safeInvoke } from "@/utils/ipc";
import { showToast } from "@/utils/toast";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { Result } from "@shared/types";
async function getSettings<K extends keyof AppSettings>(
  key: K,
): Promise<Result<AppSettings[K]>> {
  return safeInvoke(window.storeAPI.getSettings(key));
}

async function getAllSettings(): Promise<Result<AppSettings>> {
  return safeInvoke(window.storeAPI.getAllSettings());
}

async function setSettings(
  settings: Partial<AppSettings>,
): Promise<Result<AppSettings>> {
  return safeInvoke(window.storeAPI.setSettings(settings));
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
const updateSettings = (settings: Partial<AppSettings>) => {
  settingsStore.setState(settings);
  debouncedSetSettings(settings);
};

export { getAllSettings, getSettings, updateSettings };

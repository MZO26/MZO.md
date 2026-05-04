import { debouncedSetSettings } from "@/api/settingsAPI";
import { setModalState } from "@/services/state";
import { initSettingItems } from "@/settings/setting-items";
import {
  applyAppTheme,
  resolveTheme,
  setAppTheme,
  setCodeTheme,
} from "@/settings/setting-theme";
import {
  createAsyncHandler,
  getElement,
  registerAppEvents,
  setActiveItem,
} from "@/utils/helpers";
import type { Theme } from "@shared/schemas/store-schema";

async function initAppSettings() {
  const settingsContainer = getElement<HTMLDivElement>(".settings-content");
  initSettingItems(settingsContainer);
  const buttonsContainer = getElement<HTMLDivElement>(".settings-buttons");
  const modal = getElement<HTMLDivElement>(".modal");
  const openModalBtn = getElement<HTMLButtonElement>(".settings-btn");
  const closeModalBtn = getElement<HTMLButtonElement>(".closeModal-btn");
  const firstActiveBtn =
    buttonsContainer.querySelector<HTMLButtonElement>("button:first-child");
  const themeSelect = getElement<HTMLSelectElement>("#theme");
  const codeThemeSelect = getElement<HTMLSelectElement>("#code-theme");
  if (firstActiveBtn) setActiveItem(firstActiveBtn, buttonsContainer);

  closeModalBtn.addEventListener("click", () => setModalState(false));
  openModalBtn.addEventListener("click", () => setModalState(true));
  buttonsContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target === buttonsContainer) return;
    const btn = target.closest(".selection-btn") as HTMLButtonElement | null;
    if (!btn) return;
    const targetTab = btn.dataset["category"];
    if (!targetTab) return;
    settingsContainer.dataset["activetab"] = targetTab;
    setActiveItem(btn, buttonsContainer);
  });
  codeThemeSelect.addEventListener(
    "change",
    createAsyncHandler(async () => {
      const baseTheme = resolveTheme(themeSelect.value as Theme);
      const codePref = setCodeTheme(baseTheme);
      debouncedSetSettings({ "code-theme": codePref });
    }),
  );
  themeSelect.addEventListener("change", createAsyncHandler(setAppTheme));
  await applyAppTheme();
  registerAppEvents(document, {
    "app:open-settings": () => setModalState(true),
    "app:escape": () => {
      if (modal.classList.contains("show")) {
        setModalState(false);
      }
    },
  });
}

export { initAppSettings };

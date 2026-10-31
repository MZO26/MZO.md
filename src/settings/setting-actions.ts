import {
  databaseBackup,
  databaseBackupRestore,
  openAppPath,
  setSettings,
  setTheme,
  showNotification,
} from "@/api/api";
import { rendererLogger } from "@/app";
import { settingsStore } from "@/state/state";
import { CODE_THEME_MAP, THEME_MAP } from "@/utils/constants";
import { isFocusActive } from "@/utils/shortcuts";
import type { QuickAction } from "@/utils/types";
import type {
  AppSettings,
  CodeTheme,
  Theme,
} from "@shared/schemas/store-schema";
import type { ResolvedTheme, Result } from "@shared/shared-types";

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system"
    ? darkQuery.matches
      ? "dark"
      : "light"
    : THEME_MAP[theme];
}

async function applyAppTheme(
  preference: Theme,
): Promise<Result<{ theme: Theme; codeTheme: CodeTheme }>> {
  const result = await setTheme(preference, isFocusActive());
  if (!result.success) {
    rendererLogger.appError(
      "[applyAppTheme]: Failed to apply theme:",
      result.error,
    );
    return result;
  }
  document.documentElement.dataset["theme"] = result.data;
  const codePreference = settingsStore.get("code_theme");
  const resolvedTheme = resolveTheme(preference);
  const codeTheme = CODE_THEME_MAP[codePreference][resolvedTheme];
  document.documentElement.dataset["codetheme"] = codeTheme;
  return {
    success: true,
    data: { theme: preference, codeTheme: codePreference },
  };
}

function applyLineHeight(
  editorWrapper: HTMLDivElement,
  lineHeightSelect: HTMLSelectElement,
  val: AppSettings["line_height"],
) {
  let current = Number(val) || 1.5;
  current = Math.max(1.4, Math.min(current, 1.6));
  const strCurrent = String(current);
  editorWrapper.style.setProperty("--editor-line-height", strCurrent);
  if (
    lineHeightSelect.querySelector<HTMLOptionElement>(
      `option[value="${CSS.escape(strCurrent)}"]`,
    )
  ) {
    editorWrapper.setAttribute("data-line-height", strCurrent);
    lineHeightSelect.value = strCurrent;
  }
}

function applyFontSize(
  editorWrapper: HTMLDivElement,
  fontSizeSelect: HTMLSelectElement,
  val: AppSettings["font_size"],
) {
  let current = Number(val) || 18;
  current = Math.max(16, Math.min(current, 20));
  const strCurrent = String(current);
  editorWrapper.style.setProperty("--editor-font-size", `${strCurrent}px`);
  if (
    fontSizeSelect.querySelector<HTMLOptionElement>(
      `option[value="${CSS.escape(strCurrent)}"]`,
    )
  ) {
    editorWrapper.setAttribute("data-font-size", strCurrent);
    fontSizeSelect.value = strCurrent;
  }
}

function applyFontFamily(
  editorWrapper: HTMLDivElement,
  fontFamilySelect: HTMLSelectElement,
  val: AppSettings["font_family"],
) {
  const current = val || "system";
  editorWrapper.style.setProperty("--editor-font-family", current);
  if (
    fontFamilySelect.querySelector<HTMLOptionElement>(
      `option[value="${CSS.escape(current)}"]`,
    )
  ) {
    editorWrapper.setAttribute("data-font-family", current);
    fontFamilySelect.value = current;
  }
}

async function handleUpdateSettings(settings: Partial<Readonly<AppSettings>>) {
  const result = await setSettings(settings);
  if (!result.success) {
    rendererLogger.appError(
      "[handleUpdateSettings]: Failed to update settings:",
      result.error,
    );
    return;
  }
  rendererLogger.devLog("New settings update:", settings);
  settingsStore.setState(settings);
}

async function getQuickAction(action: QuickAction) {
  switch (action) {
    case "open-path":
      const open = await openAppPath();
      if (!open.success) {
        rendererLogger.appError(
          "[quickActions -> open-path]: Failed to open app path:",
          open.error,
        );
        return;
      }
      break;
    case "backup-db":
      const dbBackup = await databaseBackup();
      if (!dbBackup.success) {
        rendererLogger.appError(
          "[quickActions -> backup-db]: Failed to backup db:",
          dbBackup.error,
        );
        await showNotification("Failed to save Backup", "");
        return;
      }
      await showNotification("Backup saved", "");
      return;
    case "backup-db-restore":
      const restore = await databaseBackupRestore();
      if (!restore.success) {
        rendererLogger.appError(
          "[quickActions -> backup-db-restore]: Failed to restore db:",
          restore.error,
        );
        await showNotification("Failed to restore Backup", "");
        return;
      }
      await showNotification("Backup restored", "");
      return;
    default:
      action satisfies never;
      break;
  }
}

function confirmWithDialog(
  dialog: HTMLDialogElement,
  titleEl: HTMLElement,
  title: string,
) {
  titleEl.textContent = title;
  dialog.returnValue = "";
  dialog.showModal();
  return new Promise((resolve) => {
    const onClose = () => {
      titleEl.textContent = "";
      resolve(dialog.returnValue === "confirm");
    };
    dialog.addEventListener("close", onClose, { once: true });
  });
}

export {
  applyAppTheme,
  applyFontFamily,
  applyFontSize,
  applyLineHeight,
  confirmWithDialog,
  getQuickAction,
  handleUpdateSettings,
  resolveTheme,
};

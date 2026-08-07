import { setSettings, setTheme } from "@/api/api";
import { rendererLogger } from "@/app";
import { settingsStore } from "@/state/state";
import { CODE_THEME_MAP, THEME_MAP } from "@/utils/constants";
import { isFocusActive } from "@/utils/shortcuts";
import type {
  AppSettings,
  CodeTheme,
  Theme,
} from "@shared/schemas/store-schema";
import type { ResolvedTheme, Result } from "@shared/shared-types";

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return THEME_MAP[theme];
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
    return { success: false, error: result.error };
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

async function handleUpdateSettings(settings: Partial<AppSettings>) {
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

export {
  applyAppTheme,
  applyFontFamily,
  applyFontSize,
  applyLineHeight,
  handleUpdateSettings,
  resolveTheme,
};

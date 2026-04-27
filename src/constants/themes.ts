import type {
  AppTheme,
  CodeThemePreference,
} from "../../shared/schemas/storeSchema";
import type { Code, ResolvedTheme } from "../../shared/types";

// This file defines a mapping between the themes available in the application and the corresponding system theme that should be applied. This is used to determine which system theme (light or dark) should be applied based on the user's selected theme in the application.
const THEME_MAP = {
  system: "system",
  light: "light",
  dark: "dark",
  "light-warm": "light",
  "dark-warm": "dark",
} as const;

const CODE_THEME_MAP: Record<
  CodeThemePreference,
  Record<ResolvedTheme, Code>
> = {
  focus: { dark: "github-dark", light: "github-light" },
  balanced: { dark: "atom-one-dark", light: "atom-one-light" },
  "eye-comfort": { dark: "solarized-dark", light: "solarized-light" },
} as const;

const THEME_DATA: Record<
  Exclude<AppTheme, "system">,
  {
    color: string;
    symbolColor: string;
    background: string;
    isDark: boolean;
    focus: string;
  }
> = {
  light: {
    color: "#f8f8f8", // --bg-sidebar
    symbolColor: "#18181b", // --text-main
    background: "#fcfcfc", // --bg-editor
    isDark: false,
    focus: "#fcfcfc", // --bg-editor
  },
  dark: {
    color: "#111115",
    symbolColor: "#a1a1aa",
    background: "#1e1e21",
    isDark: true,
    focus: "#1e1e21",
  },
  "light-warm": {
    color: "#f8f7f3",
    symbolColor: "#1c1917",
    background: "#f8f7f3",
    isDark: false,
    focus: "#f8f7f3",
  },
  "dark-warm": {
    color: "#110f0b",
    symbolColor: "#d4cfc5",
    background: "#1e1b17",
    isDark: true,
    focus: "#1e1b17",
  },
} as const;

export { CODE_THEME_MAP, THEME_DATA, THEME_MAP };

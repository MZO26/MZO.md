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
  { color: string; symbolColor: string; background: string; isDark: boolean }
> = {
  light: {
    color: "#f1f1f2",
    symbolColor: "#18181b",
    background: "#fcfcfc",
    isDark: false,
  },
  dark: {
    color: "#121214",
    symbolColor: "#d4d4d8",
    background: "#1e1e21",
    isDark: true,
  },
  "light-warm": {
    color: "#ddcfc1",
    symbolColor: "#2e2823",
    background: "#f2ebe2",
    isDark: false,
  },
  "dark-warm": {
    color: "#141211",
    symbolColor: "#e2dad2",
    background: "#211f1d",
    isDark: true,
  },
} as const;

export { CODE_THEME_MAP, THEME_DATA, THEME_MAP };

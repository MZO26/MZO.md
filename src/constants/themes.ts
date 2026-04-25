import type {
  AppTheme,
  CodeThemePreference,
} from "../../shared/schemas/storeSchema";
import type { Code, ResolvedTheme } from "../../shared/types";

// This file defines a mapping between the themes available in the application and the corresponding system theme that should be applied. This is used to determine which system theme (light or dark) should be applied based on the user's selected theme in the application.
const THEME_MAP = {
  light: "light",
  dark: "dark",
  cappuccino: "light",
  "night-pine": "dark",
  ashfall: "dark",
  bronze: "dark",
  system: "system",
} as const;

const CODE_THEME_MAP: Record<
  CodeThemePreference,
  Record<ResolvedTheme, Code>
> = {
  focus: { dark: "github-dark", light: "github-light" },
  balanced: { dark: "atom-one-dark", light: "atom-one-light" },
  "eye-comfort": { dark: "everforest-dark", light: "everforest-light" },
} as const;

const THEME_DATA: Record<
  Exclude<AppTheme, "system">,
  { color: string; symbolColor: string; isDark: boolean }
> = {
  light: { color: "#f1f1f2", symbolColor: "#18181b", isDark: false },
  dark: { color: "#121214", symbolColor: "#d4d4d8", isDark: true },
  cappuccino: {
    color: "#ddcfc1",
    symbolColor: "#2e2823",
    isDark: false,
  },
  "night-pine": { color: "#111514", symbolColor: "#d9e2dd", isDark: true },
  ashfall: { color: "#121417", symbolColor: "#d9d4c9", isDark: true },
  bronze: { color: "#141211", symbolColor: "#e2dad2", isDark: true },
} as const;

export { CODE_THEME_MAP, THEME_DATA, THEME_MAP };

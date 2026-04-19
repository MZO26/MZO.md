import type { ThemeConfig } from "../shared/types";

// This file defines a mapping between the themes available in the application and the corresponding system theme that should be applied. This is used to determine which system theme (light or dark) should be applied based on the user's selected theme in the application.
const THEME_MAP = {
  light: "light",
  dark: "dark",
  "dark-glass": "dark",
  "light-glass": "light",
  paper: "light",
  cappucino: "light",
  "rainy-slate": "light",
  "night-pine": "dark",
  ashfall: "dark",
  bronze: "dark",
  system: "system",
} as const;

const THEME_DATA = {
  light: { color: "#f8f8f8", symbolColor: "#18181b", isDark: false },
  dark: { color: "#18181b", symbolColor: "#d4d4d8", isDark: true },
  "dark-glass": {
    color: "rgba(18, 18, 20, 0.45)",
    symbolColor: "#e4e4e7",
    isDark: true,
  },
  "light-glass": {
    color: "rgba(214, 217, 222, 0.52)",
    symbolColor: "#202024",
    isDark: false,
  },
  paper: { color: "#e7dfd1", symbolColor: "#2b2723", isDark: false },
  cappucino: {
    color: "#e5dbcf",
    symbolColor: "#2e2823",
    isDark: false,
  },
  "rainy-slate": { color: "#e7e3ed", symbolColor: "#27252d", isDark: false },
  "night-pine": { color: "#171c1a", symbolColor: "#d9e2dd", isDark: true },
  ashfall: { color: "#171a1e", symbolColor: "#d9d4c9", isDark: true },
  bronze: { color: "#1a1817", symbolColor: "#e2dad2", isDark: true },
} satisfies Record<string, ThemeConfig>;

export { THEME_DATA, THEME_MAP };

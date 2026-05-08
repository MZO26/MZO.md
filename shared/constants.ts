import type { CodeTheme, Theme } from "@shared/schemas/store-schema";
import type { Code, ResolvedTheme } from "@shared/types";

const LIMITS = {
  WRITE_HEAVY: 2000, // saveImage
  WRITE_STANDARD: 1000, // create, delete, store:set
  WRITE_LIGHT: 300, // update, setTheme
  READ_HEAVY: 500, // search, getAll
  READ_LIGHT: 100, // getById, store:get
};

const THEME_MAP = {
  system: "system",
  light: "light",
  dark: "dark",
  "light-warm": "light",
  "dark-warm": "dark",
} as const;

const CODE_THEME_MAP: Record<CodeTheme, Record<ResolvedTheme, Code>> = {
  focus: { dark: "github-dark", light: "github-light" },
  balanced: { dark: "atom-one-dark", light: "atom-one-light" },
  "eye-comfort": { dark: "solarized-dark", light: "solarized-light" },
} as const;

const THEME_DATA: Record<
  Exclude<Theme, "system">,
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

export { CODE_THEME_MAP, LIMITS, THEME_DATA, THEME_MAP };

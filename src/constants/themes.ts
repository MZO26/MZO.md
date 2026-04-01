import type { Theme } from "../shared/types";

// This file defines a mapping between the themes available in the application and the corresponding system theme that should be applied. This is used to determine which system theme (light or dark) should be applied based on the user's selected theme in the application.
const THEME_MAP: Record<Theme, "system" | "light" | "dark"> = {
  system: "system",
  light: "light",
  dark: "dark",
  "dark-glass": "dark",
  "light-glass": "light",
  paper: "light",
  nord: "light",
  sepia: "light",
  lavender: "light",
};

export { THEME_MAP };

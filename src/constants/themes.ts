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
} as const;

export { THEME_MAP };

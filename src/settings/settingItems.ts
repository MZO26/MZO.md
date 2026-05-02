import { selectBuilder } from "./settingsBuilder";

function buildSelects(settingsContainer: HTMLDivElement) {
  selectBuilder(
    settingsContainer,
    "theme",
    [
      { value: "system", label: "System" },
      { value: "light", label: "Light" },
      { value: "light-warm", label: "Light (warm)" },
      { value: "dark", label: "Dark" },
      { value: "dark-warm", label: "Dark (warm)" },
    ],
    "appearance",
  );
  selectBuilder(
    settingsContainer,
    "code-theme",
    [
      { value: "focus", label: "Focus" },
      { value: "balanced", label: "Balanced" },
      { value: "eye-comfort", label: "Eye Comfort" },
    ],
    "appearance",
  );
  selectBuilder(
    settingsContainer,
    "font-family",
    [
      { value: "system", label: "System" },
      { value: "arial", label: "Arial" },
      { value: "verdana", label: "Verdana" },
      { value: "georgia", label: "Georgia" },
      { value: "garamond", label: "Garamond" },
      { value: "tahoma", label: "Tahoma" },
    ],
    "editor",
  );
  selectBuilder(
    settingsContainer,
    "font-size",
    [
      { value: "12", label: "12" },
      { value: "14", label: "14" },
      { value: "16", label: "16" },
      { value: "18", label: "18" },
      { value: "20", label: "20" },
      { value: "24", label: "24" },
    ],
    "editor",
  );
  selectBuilder(
    settingsContainer,
    "line-height",
    [
      { value: "1.2", label: "1.2" },
      { value: "1.3", label: "1.3" },
      { value: "1.4", label: "1.4" },
      { value: "1.5", label: "1.5" },
      { value: "1.6", label: "1.6" },
      { value: "1.7", label: "1.7" },
    ],
    "editor",
  );
}

export { buildSelects };

import { selectBuilder } from "@/settings/setting-builder";
import { requireElement } from "@/utils/dom";

function buildSelects() {
  const settingsContainer = requireElement<HTMLDivElement>(".settings-content");
  selectBuilder(
    settingsContainer,
    "theme",
    [
      { value: "system", label: "System" },
      { value: "light", label: "Light" },
      { value: "light-warm", label: "Light · Warm" },
      { value: "dark", label: "Dark" },
      { value: "dark-warm", label: "Dark · Warm" },
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
    "highlight-theme",
    [
      { value: "done", label: "Done · Soft" },
      { value: "info", label: "Info · Soft" },
      { value: "idea", label: "Idea · Soft" },
      { value: "focus", label: "Focus · Warm" },
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
    "typography",
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
    "typography",
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
    "typography",
  );
  selectBuilder(
    settingsContainer,
    "open-window-mode",
    [
      { value: "restore", label: "Restore" },
      { value: "centered", label: "Centered" },
      { value: "maximized", label: "Maximized" },
    ],
    "app",
  );
  selectBuilder(
    settingsContainer,
    "close-window-mode",
    [
      { value: "normal", label: "Normal" },
      { value: "tray", label: "Tray" },
      { value: "minimize", label: "Minimize" },
    ],
    "app",
  );
  selectBuilder(
    settingsContainer,
    "minimize-window-mode",
    [
      { value: "taskbar", label: "Minimize to taskbar" },
      { value: "tray", label: "Minimize to tray" },
    ],
    "app",
  );
  selectBuilder(
    settingsContainer,
    "mirror-mode",
    [
      { value: "db", label: "Save only in database" },
      { value: "fs", label: "Mirror to markdown files" },
    ],
    "storage",
  );
}

export { buildSelects };

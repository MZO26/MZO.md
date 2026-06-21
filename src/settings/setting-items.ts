import { selectBuilder } from "@/settings/setting-factory";

function buildSelects() {
  selectBuilder(
    "theme",
    [
      { value: "system", label: "System" },
      { value: "light", label: "Light" },
      { value: "light-warm", label: "Light · Warm" },
      { value: "dark", label: "Dark" },
      { value: "dark-warm", label: "Dark · Warm" },
    ],
    "Appearance",
    "App-Theme",
  );
  selectBuilder(
    "code-theme",
    [
      { value: "focus", label: "Focus" },
      { value: "balanced", label: "Balanced" },
      { value: "colorless", label: "Colorless" },
    ],
    "Appearance",
    "Code-Theme",
  );
  selectBuilder(
    "highlight-theme",
    [
      { value: "context", label: "Context" },
      { value: "insight", label: "Insight" },
      { value: "action", label: "Action" },
    ],
    "Appearance",
    "Highlight-Theme",
  );
  selectBuilder(
    "note-item-display",
    [
      {
        value: "snippet",
        label: "Snippet",
      },
      {
        value: "tags",
        label: "Tags",
      },
      {
        value: "minimal",
        label: "Minimal",
      },
    ],
    "Appearance",
    "Note-Item-Display",
  );
  selectBuilder(
    "font-family",
    [
      { value: "system", label: "System" },
      { value: "arial", label: "Arial" },
      { value: "serif", label: "Serif" },
    ],
    "Editor",
    "Font-Family",
  );
  selectBuilder(
    "font-size",
    [
      { value: "16", label: "Small" },
      { value: "18", label: "Medium" },
      { value: "20", label: "Large" },
    ],
    "Editor",
    "Font-Size",
  );
  (selectBuilder(
    "line-height",
    [
      { value: "1.4", label: "Small" },
      { value: "1.5", label: "Medium" },
      { value: "1.6", label: "Large" },
    ],
    "Editor",
    "Line-Height",
  ),
    selectBuilder(
      "spellcheck",
      [
        { value: "true", label: "Enable" },
        { value: "false", label: "Disable" },
      ],
      "Editor",
      "Spellcheck",
    ),
    selectBuilder(
      "export-format",
      [
        { value: "json", label: "JSON" },
        { value: "md", label: "Markdown" },
        { value: "txt", label: "Plain Text" },
        { value: "html", label: "HTML" },
        { value: "pdf", label: "PDF" },
      ],
      "App",
      "Manual Export-Format",
    ),
    selectBuilder(
      "auto-export",
      [
        { value: "true", label: "Enable" },
        { value: "false", label: "Disable" },
      ],
      "App",
      "Auto-Export (.md)",
    ));
}

export { buildSelects };

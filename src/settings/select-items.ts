import { selectBuilder } from "@/settings/setting-builder";

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
    "appearance",
  );
  selectBuilder(
    "code-theme",
    [
      { value: "focus", label: "Focus" },
      { value: "balanced", label: "Balanced" },
      { value: "eye-comfort", label: "Eye Comfort" },
    ],
    "appearance",
  );
  selectBuilder(
    "highlight-theme",
    [
      { value: "done", label: "Done" },
      { value: "info", label: "Info" },
      { value: "idea", label: "Idea" },
      { value: "focus", label: "Focus" },
    ],
    "appearance",
  );
  selectBuilder(
    "note-item-display",
    [
      {
        value: "tags",
        label: "Tags",
      },
      {
        value: "snippet",
        label: "Snippet",
      },
      {
        value: "minimal",
        label: "Minimal",
      },
    ],
    "appearance",
  );
  selectBuilder(
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
  selectBuilder(
    "editor-focus",
    [
      { value: "on", label: "Activate Editor Focus" },
      { value: "off", label: "Deactivate Editor Focus" },
    ],
    "editor",
  );
  (selectBuilder(
    "spellcheck",
    [
      { value: "true", label: "Enable spellcheck" },
      { value: "false", label: "Disable spellcheck" },
    ],
    "app",
  ),
    selectBuilder(
      "file-backup",
      [
        { value: "json", label: "JSON" },
        { value: "md", label: "Markdown" },
        { value: "txt", label: "Plain Text" },
        { value: "html", label: "HTML" },
        { value: "pdf", label: "PDF" },
      ],
      "app",
      "Backup Format",
    ));
  selectBuilder(
    "db-optimization",
    [
      { value: "optimize-db", label: "Optimize database" },
      { value: "vacuum-db", label: "Free up disk space" },
      { value: "backup-db", label: "Backup database" },
    ],
    "app",
    "Database Settings",
  );
}

export { buildSelects };

import type {
  AppSettings,
  AutoExport,
  CodeTheme,
  FontFamily,
  FontSize,
  HighlightTheme,
  LineHeight,
  NoteItemDisplay,
  Spellcheck,
  Theme,
} from "@shared/schemas/store-schema";
import type { ExportFormat, SelectOption } from "@shared/types";

const SETTINGS_CATEGORIES = ["Appearance", "Editor", "General"] as const;

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  font_family: "system",
  font_size: "18",
  line_height: "1.5",
  spellcheck: false,
  auto_export: false,
  auto_export_path: null,
  export_format: "md",
  code_theme: "balanced",
  highlight: "context",
  note_item_display: "preview",
  toolbar_collapsed: false,
  window_bounds: { width: 800, height: 500 },
  active_tag: null,
};

const THEME_SETTINGS: readonly SelectOption<Theme>[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "light_warm", label: "Light · Warm" },
  { value: "dark", label: "Dark" },
  { value: "dark_warm", label: "Dark · Warm" },
];

const CODE_THEME_SETTINGS: readonly SelectOption<CodeTheme>[] = [
  { value: "focus", label: "Focus" },
  { value: "balanced", label: "Balanced" },
  { value: "colorless", label: "Colorless" },
];

const HIGHLIGHT_THEME_SETTINGS: readonly SelectOption<HighlightTheme>[] = [
  { value: "context", label: "Context" },
  { value: "insight", label: "Insight" },
  { value: "action", label: "Action" },
];

const NOTE_ITEM_DISPLAY_SETTINGS: readonly SelectOption<NoteItemDisplay>[] = [
  {
    value: "preview",
    label: "Preview",
  },
  {
    value: "tags",
    label: "Tags",
  },
  {
    value: "minimal",
    label: "Minimal",
  },
];

const FONT_FAMILY_SETTINGS: readonly SelectOption<FontFamily>[] = [
  { value: "system", label: "System" },
  { value: "arial", label: "Arial" },
  { value: "serif", label: "Serif" },
];

const FONT_SIZE_SETTINGS: readonly SelectOption<FontSize>[] = [
  { value: "16", label: "Small" },
  { value: "18", label: "Medium" },
  { value: "20", label: "Large" },
];

const LINE_HEIGHT_SETTINGS: readonly SelectOption<LineHeight>[] = [
  { value: "1.4", label: "Small" },
  { value: "1.5", label: "Medium" },
  { value: "1.6", label: "Large" },
];

const SPELLCHECK_SETTINGS: readonly SelectOption<Spellcheck>[] = [
  { value: true, label: "Enable" },
  { value: false, label: "Disable" },
];

const EXPORT_FORMAT_SETTINGS: readonly SelectOption<ExportFormat>[] = [
  { value: "json", label: "JSON" },
  { value: "md", label: "Markdown" },
  { value: "txt", label: "Plain Text" },
  { value: "html", label: "HTML" },
  { value: "pdf", label: "PDF" },
];

const AUTO_EXPORT_SETTINGS: readonly SelectOption<AutoExport>[] = [
  { value: true, label: "Enable" },
  { value: false, label: "Disable" },
];

export {
  AUTO_EXPORT_SETTINGS,
  CODE_THEME_SETTINGS,
  DEFAULT_SETTINGS,
  EXPORT_FORMAT_SETTINGS,
  FONT_FAMILY_SETTINGS,
  FONT_SIZE_SETTINGS,
  HIGHLIGHT_THEME_SETTINGS,
  LINE_HEIGHT_SETTINGS,
  NOTE_ITEM_DISPLAY_SETTINGS,
  SETTINGS_CATEGORIES,
  SPELLCHECK_SETTINGS,
  THEME_SETTINGS,
};

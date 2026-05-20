import z from "zod";

const StoreSchema = z.object({
  theme: z
    .enum(["system", "light", "dark", "light-warm", "dark-warm"])
    .default("system"),
  "font-family": z
    .enum(["system", "arial", "verdana", "georgia", "garamond", "tahoma"])
    .default("system"),
  "font-size": z.enum(["12", "14", "16", "18", "20", "24"]).default("16"),
  "line-height": z
    .enum(["1.2", "1.3", "1.4", "1.5", "1.6", "1.7"])
    .default("1.5"),
  "editor-focus": z.enum(["on", "off"]).default("off"),
  "code-theme": z
    .enum(["focus", "balanced", "eye-comfort"])
    .default("balanced"),
  highlight: z.enum(["done", "info", "idea", "focus"]).default("done"),
  "note-item-display": z.enum(["tags", "snippet", "minimal"]).default("tags"),
  "info-sidebar-state": z.boolean().default(false),
  "open-window-mode": z
    .enum(["restore", "centered", "maximized"])
    .default("centered"),
  "close-window-mode": z.enum(["normal", "tray", "minimize"]).default("normal"),
  "minimize-window-mode": z.enum(["taskbar", "tray"]).default("taskbar"),
  "window-bounds": z
    .object({
      width: z.number().min(1100).default(1100),
      height: z.number().min(600).default(600),
      x: z.number().optional(),
      y: z.number().optional(),
    })
    .default({ width: 1100, height: 600 }),
  spellcheck: z.boolean().default(false),
});

type AppSettings = z.infer<typeof StoreSchema>;
type Spellcheck = AppSettings["spellcheck"];
type EditorFocus = AppSettings["editor-focus"];
type NoteItemDisplay = AppSettings["note-item-display"];
type HighlightTheme = AppSettings["highlight"];
type OpenWindowMode = AppSettings["open-window-mode"];
type CloseWindowMode = AppSettings["close-window-mode"];
type MinimizeWindowMode = AppSettings["minimize-window-mode"];
type Theme = AppSettings["theme"];
type FontFamily = AppSettings["font-family"];
type FontSize = AppSettings["font-size"];
type LineHeight = AppSettings["line-height"];
type CodeTheme = AppSettings["code-theme"];
type StyleKeys = Extract<
  keyof AppSettings,
  "theme" | "font-family" | "font-size" | "line-height" | "code-theme"
>;
type StateKeys = Extract<
  keyof AppSettings,
  "note-sidebar-state" | "info-sidebar-state"
>;
export {
  StoreSchema,
  type AppSettings,
  type CloseWindowMode,
  type CodeTheme,
  type EditorFocus,
  type FontFamily,
  type FontSize,
  type HighlightTheme,
  type LineHeight,
  type MinimizeWindowMode,
  type NoteItemDisplay,
  type OpenWindowMode,
  type Spellcheck,
  type StateKeys,
  type StyleKeys,
  type Theme,
};

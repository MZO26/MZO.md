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
  spellcheck: z.boolean().default(false),
  "code-theme": z.enum(["focus", "balanced", "colorless"]).default("balanced"),
  highlight: z.enum(["done", "info", "idea", "focus"]).default("done"),
  "note-item-display": z.enum(["tags", "snippet", "minimal"]).default("tags"),
  "window-bounds": z
    .object({
      width: z.number().min(1100).default(1100),
      height: z.number().min(600).default(600),
      x: z.number().optional(),
      y: z.number().optional(),
    })
    .default({ width: 1100, height: 600 }),
});

type AppSettings = z.infer<typeof StoreSchema>;
type Spellcheck = AppSettings["spellcheck"];
type EditorFocus = AppSettings["editor-focus"];
type NoteItemDisplay = AppSettings["note-item-display"];
type HighlightTheme = AppSettings["highlight"];
type Theme = AppSettings["theme"];
type FontFamily = AppSettings["font-family"];
type FontSize = AppSettings["font-size"];
type LineHeight = AppSettings["line-height"];
type CodeTheme = AppSettings["code-theme"];
type StyleKeys = Extract<
  keyof AppSettings,
  "theme" | "font-family" | "font-size" | "line-height" | "code-theme"
>;

export {
  StoreSchema,
  type AppSettings,
  type CodeTheme,
  type EditorFocus,
  type FontFamily,
  type FontSize,
  type HighlightTheme,
  type LineHeight,
  type NoteItemDisplay,
  type Spellcheck,
  type StyleKeys,
  type Theme,
};

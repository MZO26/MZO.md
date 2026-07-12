import { DBBooleanSchema } from "@shared/schemas/note-schema";
import z from "zod";

const StoreSchema = z.object({
  theme: z
    .enum(["system", "light", "dark", "light_warm", "dark_warm"])
    .catch("system"),
  font_family: z.enum(["system", "arial", "serif"]).catch("system"),
  font_size: z.enum(["16", "18", "20"]).catch("18"),
  line_height: z.enum(["1.4", "1.5", "1.6"]).catch("1.5"),
  spellcheck: z.boolean().catch(false),
  auto_export: z.boolean().catch(false),
  auto_export_path: z.string().nullable().catch(null),
  export_format: z.enum(["md", "json", "html", "txt", "pdf"]).catch("md"),
  code_theme: z.enum(["focus", "balanced", "colorless"]).catch("balanced"),
  highlight: z.enum(["context", "insight", "action"]).catch("context"),
  note_item_display: z.enum(["preview", "tags", "minimal"]).catch("preview"),
  toolbar_collapsed: z.boolean().catch(false),
  window_bounds: z
    .object({
      width: z.number().min(800).catch(800),
      height: z.number().min(500).catch(500),
      x: z.number().optional(),
      y: z.number().optional(),
    })
    .catch({ width: 800, height: 500 }),
  active_tag: z.string().trim().min(1).nullish().catch(null).default(null),
});

const DBWindowBoundsSchema = z
  .string()
  .default('{"width":800,"height":500}')
  .transform((val, ctx) => {
    try {
      return JSON.parse(val);
    } catch {
      ctx.issues.push({
        code: "custom",
        message: "Invalid window_bounds JSON",
        input: val,
      });
      return z.NEVER;
    }
  })
  .pipe(StoreSchema.shape["window_bounds"]);

const StoreRowSchema = z.object({
  theme: StoreSchema.shape.theme,
  font_family: StoreSchema.shape["font_family"],
  font_size: StoreSchema.shape["font_size"],
  line_height: StoreSchema.shape["line_height"],
  spellcheck: DBBooleanSchema,
  auto_export: DBBooleanSchema,
  auto_export_path: StoreSchema.shape["auto_export_path"],
  export_format: StoreSchema.shape["export_format"],
  code_theme: StoreSchema.shape["code_theme"],
  highlight: StoreSchema.shape.highlight,
  note_item_display: StoreSchema.shape["note_item_display"],
  toolbar_collapsed: DBBooleanSchema,
  window_bounds: DBWindowBoundsSchema,
  active_tag: StoreSchema.shape["active_tag"],
});

const StoreToRowSchema = z.object({
  theme: StoreSchema.shape.theme,
  font_family: StoreSchema.shape["font_family"],
  font_size: StoreSchema.shape["font_size"],
  line_height: StoreSchema.shape["line_height"],
  spellcheck: StoreSchema.shape.spellcheck.transform((val) => (val ? 1 : 0)),
  auto_export: StoreSchema.shape["auto_export"].transform((val) =>
    val ? 1 : 0,
  ),
  auto_export_path: StoreSchema.shape["auto_export_path"],
  export_format: StoreSchema.shape["export_format"],
  code_theme: StoreSchema.shape["code_theme"],
  highlight: StoreSchema.shape.highlight,
  note_item_display: StoreSchema.shape["note_item_display"],
  toolbar_collapsed: StoreSchema.shape["toolbar_collapsed"].transform((val) =>
    val ? 1 : 0,
  ),
  window_bounds: StoreSchema.shape["window_bounds"].transform((val) =>
    JSON.stringify(val),
  ),
  active_tag: StoreSchema.shape["active_tag"],
});

type StoreRow = z.infer<typeof StoreRowSchema>;
type AppSettings = z.infer<typeof StoreSchema>;
type ActiveTag = AppSettings["active_tag"];
type Spellcheck = AppSettings["spellcheck"];
type AutoExportPath = AppSettings["auto_export_path"];
type AutoExport = AppSettings["auto_export"];
type ExportFormat = AppSettings["export_format"];
type NoteItemDisplay = AppSettings["note_item_display"];
type HighlightTheme = AppSettings["highlight"];
type Theme = AppSettings["theme"];
type FontFamily = AppSettings["font_family"];
type FontSize = AppSettings["font_size"];
type LineHeight = AppSettings["line_height"];
type CodeTheme = AppSettings["code_theme"];
type StyleKeys = Extract<
  keyof AppSettings,
  "theme" | "font_family" | "font_size" | "line_height" | "code_theme"
>;

export {
  StoreRowSchema,
  StoreSchema,
  StoreToRowSchema,
  type ActiveTag,
  type AppSettings,
  type AutoExport,
  type AutoExportPath,
  type CodeTheme,
  type ExportFormat,
  type FontFamily,
  type FontSize,
  type HighlightTheme,
  type LineHeight,
  type NoteItemDisplay,
  type Spellcheck,
  type StoreRow,
  type StyleKeys,
  type Theme,
};

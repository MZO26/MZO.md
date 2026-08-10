import { BoolDbSchema, BoolSchema } from "@shared/schemas/note-schema";
import z from "zod";

const WindowBoundsSchema = z
  .object({
    width: z.number().min(700).catch(1100),
    height: z.number().min(500).catch(800),
    x: z.number().optional(),
    y: z.number().optional(),
  })
  .catch({ width: 1100, height: 800 });

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
  window_bounds: WindowBoundsSchema,
  active_tag: z.string().trim().min(1).nullish().catch(null).default(null),
});

const DbWindowBoundsCodec = z.codec(z.string(), WindowBoundsSchema, {
  decode: (val) => JSON.parse(val),
  encode: (val) => JSON.stringify(val),
});

const StoreFromDbSchema = z.object({
  theme: StoreSchema.shape.theme,
  font_family: StoreSchema.shape["font_family"],
  font_size: StoreSchema.shape["font_size"],
  line_height: StoreSchema.shape["line_height"],
  spellcheck: BoolSchema,
  auto_export: BoolSchema,
  auto_export_path: StoreSchema.shape["auto_export_path"],
  export_format: StoreSchema.shape["export_format"],
  code_theme: StoreSchema.shape["code_theme"],
  highlight: StoreSchema.shape.highlight,
  note_item_display: StoreSchema.shape["note_item_display"],
  toolbar_collapsed: BoolSchema,
  window_bounds: WindowBoundsSchema,
  active_tag: StoreSchema.shape["active_tag"],
});

const StoreRowSchema = z.object({
  theme: StoreSchema.shape.theme,
  font_family: StoreSchema.shape["font_family"],
  font_size: StoreSchema.shape["font_size"],
  line_height: StoreSchema.shape["line_height"],
  spellcheck: BoolDbSchema,
  auto_export: BoolDbSchema,
  auto_export_path: StoreSchema.shape["auto_export_path"],
  export_format: StoreSchema.shape["export_format"],
  code_theme: StoreSchema.shape["code_theme"],
  highlight: StoreSchema.shape.highlight,
  note_item_display: StoreSchema.shape["note_item_display"],
  toolbar_collapsed: BoolDbSchema,
  window_bounds: z.string(),
  active_tag: StoreSchema.shape["active_tag"],
});

type StoreFromDb = z.infer<typeof StoreFromDbSchema>;
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
  DbWindowBoundsCodec,
  StoreFromDbSchema,
  StoreRowSchema,
  StoreSchema,
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
  type StoreFromDb,
  type StoreRow,
  type StyleKeys,
  type Theme,
};

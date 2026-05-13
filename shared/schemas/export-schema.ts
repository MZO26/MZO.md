import z from "zod";

const normalizeFileName = (val: string): string => {
  if (!val) return "untitled";

  return (
    val
      .normalize("NFC") // ensures consistent unicode representation ('é' as one char)
      .trim()
      .replace(/[\x00-\x1f\x80-\x9f]/g, "")
      .replace(/[/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, "_")
      .replace(/^\.+|\.+$/g, "")
      .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..+)?$/i, "_$1$2")
      .slice(0, 200) || "untitled"
  );
};

const FileNameSchema = z
  .string()
  .transform(normalizeFileName)
  .pipe(z.string().min(1).max(255));

// for md, txt, html and pdf (because html is used for pdf)
const StringContentSchema = z
  .string()
  .min(1, "Content is empty")
  .max(10_000_000, "Content exceeds maximum size");

const MdSchema = z.object({
  extension: z.literal("md"),
  content: StringContentSchema,
  fileName: FileNameSchema,
});

const TxtSchema = z.object({
  extension: z.literal("txt"),
  content: StringContentSchema,
  fileName: FileNameSchema,
});

const HtmlSchema = z.object({
  extension: z.literal("html"),
  content: StringContentSchema,
  fileName: FileNameSchema,
});

const JsonSchema = z.object({
  extension: z.literal("json"),
  content: StringContentSchema,
  fileName: FileNameSchema,
});

const PdfSchema = z.object({
  extension: z.literal("pdf"),
  content: StringContentSchema,
  fileName: FileNameSchema,
});

const ExportRequestSchema = z.discriminatedUnion("extension", [
  HtmlSchema,
  MdSchema,
  TxtSchema,
  JsonSchema,
  PdfSchema,
]);

const ExportManyRequestSchema = z.discriminatedUnion("extension", [
  MdSchema.pick({ extension: true }),
  TxtSchema.pick({ extension: true }),
  JsonSchema.pick({ extension: true }),
]);

const ImportRequestSchema = z.discriminatedUnion("extension", [
  HtmlSchema,
  MdSchema,
  TxtSchema,
  JsonSchema,
]);

type ExportManyRequest = z.infer<typeof ExportManyRequestSchema>;
type ImportRequest = z.infer<typeof ImportRequestSchema>;
type ExportRequest = z.infer<typeof ExportRequestSchema>;

export {
  ExportManyRequestSchema,
  ExportRequestSchema,
  FileNameSchema,
  ImportRequestSchema,
  type ExportManyRequest,
  type ExportRequest,
  type ImportRequest,
};

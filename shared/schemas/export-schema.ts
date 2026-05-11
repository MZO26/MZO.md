import z from "zod";

const normalizeFileName = (val: string) =>
  val
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");

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

const ImportRequestSchema = z.discriminatedUnion("extension", [
  HtmlSchema,
  MdSchema,
  TxtSchema,
  JsonSchema,
]);

type ImportRequest = z.infer<typeof ImportRequestSchema>;
type ExportRequest = z.infer<typeof ExportRequestSchema>;

export {
  ExportRequestSchema,
  FileNameSchema,
  ImportRequestSchema,
  type ExportRequest,
  type ImportRequest,
};

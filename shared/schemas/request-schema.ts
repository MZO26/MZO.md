import { DateSchema } from "@shared/schemas/note-schema";
import { UNTITLED } from "@shared/shared-constants";
import z from "zod";

function truncateAtBoundary(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  const slice = input.slice(0, maxLength);
  const cut = Math.max(
    slice.lastIndexOf(" "),
    slice.lastIndexOf("-"),
    slice.lastIndexOf("_"),
    slice.lastIndexOf("."),
  );
  return (cut > 0 ? slice.slice(0, cut) : slice).trim();
}

function normalizeFileName(val: string): string {
  if (!val) return UNTITLED;
  const sanitized = val
    .normalize("NFC")
    .replace(/[\x00-\x1f\x80-\x9f/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/^\.+|[. ]+$/g, "")
    .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..+)?$/i, "_$1$2");
  const finalName = truncateAtBoundary(sanitized, 100).replace(/[. ]+$/g, "");
  return finalName || UNTITLED;
}

const FileNameSchema = z
  .string()
  .nullish()
  .transform((val) => normalizeFileName(val ?? ""))
  .pipe(z.string().min(1).max(255));

const StringContentSchema = z
  .string()
  .max(3_000_000, "Content exceeds maximum size")
  .optional()
  .transform((val) => {
    if (!val || val.trim() === "") return UNTITLED;
    return val;
  });

const ExportBaseSchema = z.object({
  created_at: DateSchema,
  fileName: FileNameSchema,
  content: StringContentSchema,
});

const MdSchema = ExportBaseSchema.extend({
  extension: z.literal("md"),
});

const TxtSchema = ExportBaseSchema.extend({
  extension: z.literal("txt"),
});

const HtmlSchema = ExportBaseSchema.extend({
  extension: z.literal("html"),
});

const JsonSchema = ExportBaseSchema.extend({
  extension: z.literal("json"),
});

const PdfSchema = ExportBaseSchema.extend({
  extension: z.literal("pdf"),
  landscape: z.boolean().default(false),
});

const ExportRequestSchema = z.discriminatedUnion("extension", [
  HtmlSchema,
  MdSchema,
  TxtSchema,
  JsonSchema,
  PdfSchema,
]);

const ExportItemSchema = z.discriminatedUnion("extension", [
  HtmlSchema,
  MdSchema,
  TxtSchema,
  JsonSchema,
  PdfSchema,
]);

const ExportManyRequestSchema = z.array(ExportItemSchema);

const ImportRequestSchema = z.discriminatedUnion("extension", [
  HtmlSchema.omit({ created_at: true }),
  MdSchema.omit({ created_at: true }),
  JsonSchema.omit({ created_at: true }),
  TxtSchema.omit({ created_at: true }),
]);

const FilePathRequestSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("external"),
    filePaths: z.array(z.string().min(1)).min(1),
    checked: z.boolean().default(false),
  }),
  z.object({
    source: z.literal("dialog"),
    checked: z.boolean().default(false),
  }),
]);

const ExistenceImportCheckSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("exists"),
    fileName: z.string(),
    content: z.string(),
  }),
  z.object({
    status: z.literal("missing"),
    fileName: z.string(),
    content: z.string(),
  }),
]);

type ExportContent = z.infer<typeof ExportItemSchema>;
type ImportContent = z.infer<typeof ImportRequestSchema>;
type FilePathRequest = z.infer<typeof FilePathRequestSchema>;
type ExportManyRequest = z.infer<typeof ExportManyRequestSchema>;
type ImportRequest = z.infer<typeof ImportRequestSchema>;
type ExportRequest = z.infer<typeof ExportRequestSchema>;
type ExistenceImportCheck = z.infer<typeof ExistenceImportCheckSchema>;

export {
  ExistenceImportCheckSchema,
  ExportManyRequestSchema,
  ExportRequestSchema,
  FileNameSchema,
  FilePathRequestSchema,
  ImportRequestSchema,
  StringContentSchema,
  type ExistenceImportCheck,
  type ExportContent,
  type ExportManyRequest,
  type ExportRequest,
  type FilePathRequest,
  type ImportContent,
  type ImportRequest,
};

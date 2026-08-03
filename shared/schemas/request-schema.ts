import { MAX_IPC_PAYLOAD_SIZE } from "@shared/constants/main-constants";
import { UNTITLED } from "@shared/constants/renderer-constants";
import {
  AutoExportWritePayloadSchema,
  DateSchema,
  PlainTextSchema,
} from "@shared/schemas/note-schema";
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
  .max(MAX_IPC_PAYLOAD_SIZE, "Content exceeds maximum size")
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

const WriteAutoExportRequestSchema = MdSchema.extend({
  oldFileName: FileNameSchema.optional(),
});

const DeleteAutoExportRequestSchema = MdSchema.omit({
  content: true,
});

const AutoExportRequestSchema = MdSchema.extend({ updated_at: DateSchema });

const OpenAutoExportPathSchema = AutoExportRequestSchema.omit({
  content: true,
});

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
  }),
  z.object({
    source: z.literal("dialog"),
  }),
]);

const SyncRequestPayloadSchema = AutoExportWritePayloadSchema.extend({
  updated_at: DateSchema,
});

const SyncResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("MISSING") }),
  z.object({ status: z.literal("UNCHANGED") }),
  z.object({
    status: z.literal("MODIFIED"),
    markdown: PlainTextSchema,
    appContent: PlainTextSchema,
  }),
]);

type SyncResult = z.infer<typeof SyncResultSchema>;
type ExportContent = z.infer<typeof ExportItemSchema>;
type ImportContent = z.infer<typeof ImportRequestSchema>;
type FilePathRequest = z.infer<typeof FilePathRequestSchema>;
type SyncRequestPayload = z.infer<typeof SyncRequestPayloadSchema>;
type OpenAutoExportPathRequest = z.infer<typeof OpenAutoExportPathSchema>;
type AutoExportRequest = z.infer<typeof AutoExportRequestSchema>;
type WriteAutoExportRequest = z.infer<typeof WriteAutoExportRequestSchema>;
type DeleteAutoExportRequest = z.infer<typeof DeleteAutoExportRequestSchema>;
type ExportManyRequest = z.infer<typeof ExportManyRequestSchema>;
type ImportRequest = z.infer<typeof ImportRequestSchema>;
type ExportRequest = z.infer<typeof ExportRequestSchema>;

export {
  AutoExportRequestSchema,
  DeleteAutoExportRequestSchema,
  ExportManyRequestSchema,
  ExportRequestSchema,
  FileNameSchema,
  FilePathRequestSchema,
  ImportRequestSchema,
  OpenAutoExportPathSchema,
  StringContentSchema,
  SyncRequestPayloadSchema,
  SyncResultSchema,
  WriteAutoExportRequestSchema,
  type AutoExportRequest,
  type DeleteAutoExportRequest,
  type ExportContent,
  type ExportManyRequest,
  type ExportRequest,
  type FilePathRequest,
  type ImportContent,
  type ImportRequest,
  type OpenAutoExportPathRequest,
  type SyncRequestPayload,
  type SyncResult,
  type WriteAutoExportRequest,
};

import { MAX_IPC_PAYLOAD_SIZE, UNTITLED } from "@shared/constants";
import {
  AutoExportWritePayloadSchema,
  DateSchema,
} from "@shared/schemas/note-schema";
import z from "zod";

const truncateAtBoundary = (input: string, maxLength: number): string => {
  if (input.length <= maxLength) return input;
  const slice = input.slice(0, maxLength);
  const breakpoints = [" ", "-", "_", "."];
  let cut = -1;
  for (const bp of breakpoints) {
    cut = Math.max(cut, slice.lastIndexOf(bp));
  }
  return (cut > 0 ? slice.slice(0, cut) : slice).trim();
};

const normalizeFileName = (val: string): string => {
  if (!val) return UNTITLED;
  const safe = truncateAtBoundary(
    val
      .normalize("NFC")
      .trim()
      .replace(/[\x00-\x1f\x80-\x9f]/g, "")
      .replace(/[/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, " ")
      .replace(/-+/g, "-")
      .replace(/^\.+/, "")
      .replace(/[. ]+$/g, "")
      .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..+)?$/i, "_$1$2"),
    100,
  ).replace(/[. ]+$/g, "");
  return safe || UNTITLED;
};

const FileNameSchema = z
  .string()
  .transform(normalizeFileName)
  .pipe(z.string().min(1).max(255));

// for md, txt, html and pdf (because html is used for pdf)
const StringContentSchema = z
  .string()
  .refine((val) => {
    console.log("String lengh:", val.length);
    return true;
  })
  .max(MAX_IPC_PAYLOAD_SIZE, "Content exceeds maximum size")
  .optional()
  .transform((val) => {
    if (!val || val.trim() === "") {
      return UNTITLED;
    }
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

const NotificationSchema = z.object({
  title: z.string().trim().min(1).max(50),
  body: z.string().trim().max(100).default(""),
});

const SyncRequestPayloadSchema = AutoExportWritePayloadSchema.extend({
  updated_at: DateSchema,
});

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
  NotificationSchema,
  OpenAutoExportPathSchema,
  StringContentSchema,
  SyncRequestPayloadSchema,
  WriteAutoExportRequestSchema,
  type AutoExportRequest,
  type DeleteAutoExportRequest,
  type ExportManyRequest,
  type ExportRequest,
  type FilePathRequest,
  type ImportRequest,
  type OpenAutoExportPathRequest,
  type SyncRequestPayload,
  type WriteAutoExportRequest,
};

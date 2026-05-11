import {
  ExportRequestSchema,
  FileNameSchema,
  ImportRequestSchema,
} from "@shared/schemas/export-schema";
import { ImagePayloadSchema } from "@shared/schemas/image-schema";
import {
  CreateNotePayloadSchema,
  IdSchema,
  SearchSchema,
  TagSchema,
  UpdateNotePayloadSchema,
} from "@shared/schemas/note-schema";
import { StoreSchema } from "@shared/schemas/store-schema";
import z from "zod";

function validation<T>(schema: z.ZodType<T>, payload: unknown): T {
  const validation = schema.safeParse(payload);
  if (!validation.success) {
    console.error(
      "Validation failed:",
      JSON.stringify(z.treeifyError(validation.error), null, 2),
    );

    throw validation.error;
  }
  return validation.data;
}

function validateUpdate(payload: unknown) {
  return validation(UpdateNotePayloadSchema, payload);
}

function validateCreate(payload: unknown) {
  return validation(CreateNotePayloadSchema, payload);
}

function validateId(id: unknown) {
  return validation(IdSchema, id);
}

function validateTag(tag: unknown) {
  return validation(TagSchema, tag);
}

function validateSearch(searchTerm: unknown, limit: unknown) {
  return validation(SearchSchema, { searchTerm, limit });
}

function validateStore(settings: unknown) {
  return validation(StoreSchema, settings);
}

function validateTheme(theme: unknown) {
  return validation(StoreSchema.shape.theme, theme);
}

function validateImage(payload: unknown) {
  return validation(ImagePayloadSchema, payload);
}

function validateExport(payload: unknown) {
  return validation(ExportRequestSchema, payload);
}

function validateImport(payload: unknown) {
  return validation(ImportRequestSchema, payload);
}

function validateFiles(payload: unknown) {
  return validation(ImportRequestSchema, payload);
}

function validateFileName(payload: unknown) {
  return validation(FileNameSchema, payload);
}

export {
  validateCreate,
  validateExport,
  validateFileName,
  validateFiles,
  validateId,
  validateImage,
  validateImport,
  validateSearch,
  validateStore,
  validateTag,
  validateTheme,
  validateUpdate,
};

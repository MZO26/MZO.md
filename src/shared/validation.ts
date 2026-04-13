import z from "zod";
import {
  CreateNotePayloadSchema,
  IdSchema,
  SearchSchema,
  UpdateNotePayloadSchema,
} from "./schemas/noteSchema";

type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      message: string;
      errors: Record<string, string[] | undefined>;
    };

function validation<T extends z.ZodType>(
  schema: T,
  payload: unknown,
): ValidationResult<z.output<T>> {
  const validation = schema.safeParse(payload);
  if (!validation.success) {
    console.error("Validation failed:", z.treeifyError(validation.error));

    return {
      success: false,
      message: "Invalid data provided",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }
  return {
    success: true as const,
    data: validation.data,
  };
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

function validateSearch(searchTerm: string, limit: number) {
  return validation(SearchSchema, { searchTerm, limit });
}

export { validateCreate, validateId, validateSearch, validateUpdate };

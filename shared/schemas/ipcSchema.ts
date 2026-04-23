import z from "zod";
import { NoteSchema, NotesSchema } from "./noteSchema";

const createIpcResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.discriminatedUnion("success", [
    z
      .object({
        success: z.literal(true),
        data: dataSchema,
      })
      .strict(),

    z
      .object({
        success: z.literal(false),
        message: z.string(),
        errors: z.record(z.string(), z.array(z.string()).optional()).optional(),
      })
      .strict(),
  ]);

const NoteResponseSchema = createIpcResponseSchema(NoteSchema);
const NotesResponseSchema = createIpcResponseSchema(NotesSchema);

export { NoteResponseSchema, NotesResponseSchema };

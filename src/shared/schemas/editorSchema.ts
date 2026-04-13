import type { JSONContent } from "@tiptap/core";
import z from "zod";

const MAX_CHARS = 250_000;

const jsonNode: z.ZodType<JSONContent> = z.lazy(() =>
  z
    .object({
      type: z.string().optional(),
      attrs: z.record(z.string(), z.unknown()).optional(),
      content: z.array(jsonNode).optional(),
      marks: z.array(z.record(z.string(), z.unknown())).optional(),
      text: z.string().optional(),
    })
    .catchall(z.any()),
) as any;

const EditorDocSchema = z
  .object({
    type: z.literal("doc"),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(jsonNode).default([{ type: "paragraph" }]),
  })
  .refine((doc) => JSON.stringify(doc).length <= MAX_CHARS, {
    message: `Document exceeds ${MAX_CHARS} characters`,
    path: ["content"],
  })
  .default({
    type: "doc",
    content: [{ type: "paragraph" }],
  });

const DbContentSchema = z
  .string()
  .transform((val) => {
    try {
      return JSON.parse(val);
    } catch (e) {
      return z.NEVER;
    }
  })
  .pipe(EditorDocSchema);

export { DbContentSchema, EditorDocSchema };

import type { JSONContent } from "@tiptap/core";
import z from "zod";

const MAX_CHARS = 250_000;

const jsonNode: z.ZodType<JSONContent> = z.lazy(() =>
  z
    .object({
      type: z.string().nullable().optional(),
      attrs: z.record(z.string(), z.unknown()).nullable().optional(),
      content: z.array(jsonNode).optional(),
      marks: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
      text: z.string().nullable().optional(),
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
  .transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val);
      return parsed;
    } catch (e) {
      ctx.addIssue({
        code: "custom",
        message: "Content is corrupted (invalid JSON)",
      });
      return z.NEVER;
    }
  })
  .pipe(EditorDocSchema);

//input gets validated -> processed into parsed object -> piped to validate output against EditorDocSchema

const ExternalUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return ["http:", "https:", "mailto:", "tel:", "appimg:"].includes(
    url.protocol,
  );
}, "Unsupported link protocol");

type EditorDoc = z.infer<typeof EditorDocSchema>;

export { DbContentSchema, EditorDocSchema, ExternalUrlSchema, type EditorDoc };

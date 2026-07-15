import type { JSONContent } from "@tiptap/core";
import z from "zod";

const MAX_CHARS = 1_000_000;

const JSONNode: z.ZodType<JSONContent> = z.lazy(() =>
  z
    .object({
      type: z.string().nullable().optional(),
      attrs: z.record(z.string(), z.unknown()).nullable().optional(),
      content: z.array(JSONNode).optional(),
      marks: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
      text: z.string().nullable().optional(),
    })
    .catchall(z.any()),
) as any;

const EditorDocSchema = z
  .object({
    type: z.literal("doc"),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(JSONNode).default([{ type: "paragraph" }]),
  })
  .superRefine((doc, ctx) => {
    const jsonString = JSON.stringify(doc);
    if (jsonString.includes('"data:image/')) {
      ctx.addIssue({
        code: "custom",
        message: "Inline Base64 images are not allowed.",
        path: ["content"],
      });
    }
    if (jsonString.length > MAX_CHARS) {
      ctx.addIssue({
        code: "custom",
        message: `Document exceeds ${MAX_CHARS} characters.`,
        path: ["content"],
      });
    }
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

const ExternalUrlSchema = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return ["https:", "appimg:"].includes(url.protocol);
  } catch {
    return false;
  }
}, "Invalid URL or unsupported protocol");

type EditorDoc = z.infer<typeof EditorDocSchema>;

export { DbContentSchema, EditorDocSchema, ExternalUrlSchema, type EditorDoc };

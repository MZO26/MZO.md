import { EMPTY_DOC } from "@shared/constants";
import type { JSONContent } from "@tiptap/core";
import z from "zod";

const JSONNodeSchema: z.ZodType<JSONContent> = z.lazy(() =>
  z
    .object({
      type: z.string().nullable().optional(),
      attrs: z.record(z.string(), z.unknown()).nullable().optional(),
      content: z.array(JSONNodeSchema).optional(),
      marks: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
      text: z.string().nullable().optional(),
    })
    .catchall(z.any()),
) as any;

const EditorDocSchema = z
  .object({
    type: z.literal("doc"),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(JSONNodeSchema).default([
      {
        type: "heading",
        attrs: { level: 1 },
      },
    ]),
  })
  .default(EMPTY_DOC);

const DbContentSchema = z.string().transform((val, ctx) => {
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
});

//input gets validated -> processed into parsed object -> piped to validate output against EditorDocSchema

const ExternalUrlSchema = z.string().refine((value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}, "Invalid URL or unsupported protocol");

type EditorDoc = z.infer<typeof EditorDocSchema>;
type JSONNode = z.infer<typeof JSONNodeSchema>;

export {
  DbContentSchema,
  EditorDocSchema,
  ExternalUrlSchema,
  JSONNodeSchema,
  type EditorDoc,
  type JSONNode,
};

import { EMPTY_DOC } from "@shared/shared-constants";
import type { JSONContent } from "@tiptap/core";
import z from "zod";

function isEditorDoc(value: unknown): value is JSONContent {
  if (typeof value !== "object" || value === null) return false;
  if (!("type" in value) || value.type !== "doc") return false;
  if (!("content" in value) || !Array.isArray(value.content)) return false;
  return true;
}

const EditorDocSchema: z.ZodType<JSONContent> = z
  .object({
    type: z.literal("doc"),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z
      .array(
        z.looseObject({
          type: z.string(),
        }),
      )
      .min(1)
      .default(EMPTY_DOC.content),
  })
  .default(EMPTY_DOC);

const DbContentCodec = z.codec(z.string(), EditorDocSchema, {
  // decode checks against z.string() and parses the value
  decode: (val) => JSON.parse(val),
  // encode checks against EditorDocSchema and stringifies the doc for db
  encode: (doc) => JSON.stringify(doc),
});

type EditorDoc = z.infer<typeof EditorDocSchema>;

export { DbContentCodec, EditorDocSchema, isEditorDoc, type EditorDoc };

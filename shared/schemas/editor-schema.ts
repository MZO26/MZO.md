import { EMPTY_DOC } from "@shared/shared-constants";
import type { JSONContent } from "@tiptap/core";
import z from "zod";

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

export { DbContentCodec, EditorDocSchema };

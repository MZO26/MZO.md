import { EMPTY_DOC } from "@shared/constants";
import type { JSONContent } from "@tiptap/core";
import type { Url } from "url";
import z from "zod";

function isEditorDoc(value: unknown): value is JSONContent {
  if (typeof value !== "object" || value === null) return false;
  if (!("type" in value) || value.type !== "doc") return false;
  if (!("content" in value) || !Array.isArray(value.content)) return false;
  return true;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEditorDocValidation(value: unknown): value is JSONContent {
  if (!isObject(value)) return false;
  if (value["type"] !== "doc") return false;
  if (!Array.isArray(value["content"])) return false;
  const stack: unknown[] = [...value["content"]];
  while (stack.length) {
    const node = stack.pop();
    if (!isObject(node)) return false;
    if (typeof node["type"] !== "string") return false;
    if (
      "text" in node &&
      node["text"] !== undefined &&
      typeof node["text"] !== "string"
    ) {
      return false;
    }
    if ("content" in node) {
      if (node["content"] !== undefined && !Array.isArray(node["content"])) {
        return false;
      }
      if (Array.isArray(node["content"])) {
        stack.push(...node["content"]);
      }
    }
  }
  return true;
}

const EditorDocSchema = z
  .unknown()
  .refine(isEditorDocValidation, {
    message: "Invalid editor document structure",
  })
  .default(EMPTY_DOC);

const DbContentCodec = z.codec(z.string(), EditorDocSchema, {
  // decode checks against z.string() and parses the value
  decode: (val) => JSON.parse(val),
  // encode checks against EditorDocSchema and stringifies the doc for db
  encode: (doc) => JSON.stringify(doc),
});

type EditorDoc = z.infer<typeof EditorDocSchema>;

export {
  DbContentCodec,
  EditorDocSchema,
  isEditorDoc,
  type EditorDoc,
  type Url,
};

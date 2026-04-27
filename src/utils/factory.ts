import type { CreateNotePayload } from "../../shared/schemas/noteSchema";

function createNotePayload(data?: CreateNotePayload): CreateNotePayload {
  return {
    content: data?.content || {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    plainText: data?.plainText || "",
  };
}

export { createNotePayload };

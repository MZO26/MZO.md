import type { CreateNotePayload, UpdateNotePayload } from "../../shared/types";

function createNotePayload(data?: CreateNotePayload): CreateNotePayload {
  return {
    content: data?.content || {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    plainText: data?.plainText || "",
  };
}

function updateNotePayload(data: UpdateNotePayload): UpdateNotePayload {
  return {
    ...data,
  };
}

export { createNotePayload, updateNotePayload };

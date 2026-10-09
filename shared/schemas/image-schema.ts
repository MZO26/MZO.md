import type { ImageRow } from "@shared/schemas/note-schema";
import z from "zod";

const ImagePayloadSchema = z.object({
  extension: z.enum(["jpeg", "png", "gif", "webp"]).default("webp"),
  imageData: z.custom<Uint8Array>((val) => val instanceof Uint8Array),
});

const ImageHashSchema = z.string().regex(/^[a-f0-9]{64}(\.[a-z0-9]+)?$/i);

const DbImageSchema = z.array(ImageHashSchema).default([]);

const ImagePayloadsSchema = z.array(ImagePayloadSchema);

type ImageExtension = z.infer<typeof ImagePayloadSchema>["extension"];
type ImagePayload = z.infer<typeof ImagePayloadSchema>;

type ImageHash = z.infer<typeof ImageHashSchema>;
type DbImage = z.infer<typeof DbImageSchema>;

export {
  DbImageSchema,
  ImageHashSchema,
  ImagePayloadSchema,
  ImagePayloadsSchema,
  type DbImage,
  type ImageExtension,
  type ImageHash,
  type ImagePayload,
  type ImageRow,
};

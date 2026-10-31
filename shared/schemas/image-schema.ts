import z from "zod";

const ImagePayloadSchema = z.object({
  extension: z.enum(["jpeg", "png", "gif", "webp"]).default("webp"),
  imageData: z.custom<Uint8Array>((val) => val instanceof Uint8Array),
});

const ImageHashSchema = z.string().regex(/^[a-f0-9]{64}(\.[a-z0-9]+)?$/i);

const DbImageSchema = z.array(ImageHashSchema).default([]);

const ImagePayloadsSchema = z.array(ImagePayloadSchema);

type ImagePayload = z.infer<typeof ImagePayloadSchema>;

export {
  DbImageSchema,
  ImageHashSchema,
  ImagePayloadsSchema,
  type ImagePayload,
};

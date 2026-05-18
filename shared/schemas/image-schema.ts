import z from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ImagePayloadSchema = z.object({
  extension: z.enum(["jpeg", "png", "gif", "webp"]).default("webp"),
  imageData: z
    .custom<Uint8Array>((val) => val instanceof Uint8Array)
    .refine((buffer) => buffer.length <= MAX_FILE_SIZE),
});

type ImageExtension = z.infer<typeof ImagePayloadSchema>["extension"];
type ImagePayload = z.infer<typeof ImagePayloadSchema>;

export { ImagePayloadSchema, type ImageExtension, type ImagePayload };

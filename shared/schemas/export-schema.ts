import z from "zod";

const ExportRequestSchema = z.object({
  content: z.string().max(50_000_000, "Content exceeds maximum export size"), // 50mb

  extension: z.enum(["md", "txt", "html", "json"]).default("md"),

  defaultName: z
    .string()
    .min(1)
    .max(50)
    .transform((val) => {
      return (
        val
          .trim()
          // Replace spaces with underscores
          .replace(/\s+/g, "_")
          // Replace any char that is not a letter, number, dash, or underscore with an underscore
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          // Collapse multiple consecutive underscores into a single one
          .replace(/_+/g, "_")
      );
    }),
});

type ExportRequest = z.infer<typeof ExportRequestSchema>;

export { ExportRequestSchema, type ExportRequest };

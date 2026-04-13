import z from "zod";

const SettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  font: z.enum([]),
});

export { SettingsSchema };

import z from "zod";

const StoreSchema = z.object({
  theme: z
    .enum(["system", "light", "dark", "light-warm", "dark-warm"])
    .default("system"),
  font: z
    .enum(["system", "arial", "verdana", "georgia", "garamond", "tahoma"])
    .default("system"),
  "code-theme": z
    .enum(["focus", "balanced", "eye-comfort"])
    .default("balanced"),
});
export type Settings = z.infer<typeof StoreSchema>;
export type AppTheme = Settings["theme"];
export type AppFont = Settings["font"];
export type CodeThemePreference = Settings["code-theme"];
export { StoreSchema };

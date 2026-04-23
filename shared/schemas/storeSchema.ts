import z from "zod";

const StoreSchema = z.object({
  theme: z
    .enum([
      "system",
      "light",
      "dark",
      "dark-glass",
      "light-glass",
      "paper",
      "cappuccino",
      "rainy-slate",
      "night-pine",
      "ashfall",
      "bronze",
    ])
    .default("system"),
  font: z
    .enum([
      "system",
      "arial",
      "verdana",
      "trebuchet",
      "georgia",
      "courier",
      "times",
      "palatino",
      "garamond",
      "tahoma",
      "century",
      "consolas",
    ])
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

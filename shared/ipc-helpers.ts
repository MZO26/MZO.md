import z from "zod";

function validation<T extends z.ZodType>(
  schema: T,
  payload: unknown,
): z.infer<T> {
  const validation = schema.safeParse(payload);
  if (!validation.success) {
    console.error(
      "Validation failed:",
      JSON.stringify(validation.error, null, 2),
    );
    console.dir(validation.error.issues, { depth: null });
    throw validation.error;
  }
  return validation.data;
}

function measure<T>(fn: () => T): number {
  const start = performance.now();
  fn();
  const end = performance.now();

  return Math.round((end - start) * 100) / 100;
}

export { measure, validation };

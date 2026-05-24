import z from "zod";

function validation<T extends z.ZodType>(
  schema: T,
  payload: unknown,
): z.infer<T> {
  const validate = schema.safeParse(payload);
  if (!validate.success) {
    console.error(
      "Validation failed:",
      JSON.stringify(validate.error, null, 2),
    );
    console.dir(validate.error.issues, { depth: null });
    throw validate.error;
  }
  return validate.data;
}

function measure<T>(fn: () => T) {
  const start = performance.now();
  fn();
  const end = performance.now();
  return Math.round((end - start) * 100) / 100;
}

export { measure, validation };

function validateUUID(value: string): string | undefined {
  const cleanedValue = value.replace(/[\[\]]/g, "").trim();
  const UUID_REGEX =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (UUID_REGEX.test(cleanedValue)) {
    return cleanedValue;
  }
  return undefined;
}
export { validateUUID };

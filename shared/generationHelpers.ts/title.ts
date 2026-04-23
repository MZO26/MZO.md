function generateTitle(text: unknown): string {
  if (typeof text !== "string") return "New Note";
  const cleanText = text.replace(/#[\p{L}\p{N}_]+/gu, "").trim();
  const lines = cleanText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines[0] ?? "New Note";
}

export { generateTitle };

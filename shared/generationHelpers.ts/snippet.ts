function generateSnippet(text: unknown): string {
  if (typeof text !== "string") return "";
  const cleanLines = text
    .split("\n")
    .map((line) => line.replace(/#[\p{L}\p{N}_]+/gu, "")) //remove hashtags that are preserved for tagstrim())
    .filter((line) => line.length > 0); //creates an array which shows the split and filtered strings

  return cleanLines
    .slice(1) // skips the first line (preserved for title). Slice(1) takes everything except the first element.
    .join(" ")
    .replace(/\s{2,}/g, " ") //remove extra spaces
    .trim()
    .substring(0, 50); //truncates to 50 characters
}

export { generateSnippet };

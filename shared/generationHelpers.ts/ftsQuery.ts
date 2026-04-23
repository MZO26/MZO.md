function generateFtsQuery(searchTerm: unknown): string {
  if (typeof searchTerm !== "string") {
    return "";
  }
  const cleanSearch = searchTerm.replace(/[^\p{L}\p{N}\s]/gu, " ");
  const ftsQuery = cleanSearch
    .split(/\s+/)
    .filter((word: string) => word.length > 0)
    .map((word: string) => `"${word}"*`)
    .join(" AND ");
  return ftsQuery;
}

export { generateFtsQuery };

import { TagSchema } from "../schemas/noteSchema";

function generateTags(input: unknown): string[] {
  let tags: unknown[] = [];
  if (typeof input === "string") {
    const matches = input.match(/#[\p{L}\p{N}_]+/gu);
    //checks if input matches the tag form
    if (matches) {
      tags = matches.map((tag) => tag.slice(1));
      //creates tag array
    } else tags = []; //sets it to an empty array otherwise
  } else if (Array.isArray(input)) {
    tags = input;
  } // checks if input is already an array and sets tags to input
  const uniqueTags = Array.from(new Set(tags));
  // creates a set of unique tags and then creates an array from it
  const validTags = uniqueTags
    .map((tag) => TagSchema.safeParse(tag))
    .filter((result) => result.success)
    .map((result) => result.data);

  return validTags.slice(0, 3);
}

export { generateTags };

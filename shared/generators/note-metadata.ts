import type { JSONContent } from "@tiptap/core";

function getTodoStats(content: JSONContent) {
  let total = 0;
  let completed = 0;
  if (!content) {
    return { total, completed, left: 0 };
  }
  const stack: JSONContent[] = [content];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === "taskItem") {
      total++;
      if (node.attrs?.["checked"]) {
        completed++;
      }
    }
    const content = node.content;
    if (content) {
      for (let i = 0, len = content.length; i < len; i++) {
        const child = content[i];
        if (child) {
          stack.push(child);
        }
      }
    }
  }
  return {
    total,
    completed,
    left: total - completed,
  };
}

export { getTodoStats };

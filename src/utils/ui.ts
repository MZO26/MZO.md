import { requireElement } from "@/utils/dom";
import { useTemplates, type TemplateRegistry } from "./registry";

function createTooltipContent(baseText: string) {
  return baseText
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function createGlobalSpinner(showDelay: number = 200) {
  const spinner = requireElement<HTMLDivElement>(".app-loading");
  return {
    async wrap<T>(
      task: () => T | Promise<T>,
      delay = showDelay,
    ): Promise<Awaited<T>> {
      const showTimer = setTimeout(() => {
        spinner.hidden = false;
      }, delay);
      try {
        return typeof task === "function" ? await task() : await task;
      } finally {
        clearTimeout(showTimer);
        spinner.hidden = true;
      }
    },
  };
}

function isDiv(node: Node | null): node is HTMLDivElement {
  return node instanceof HTMLDivElement;
}

function createTemplateCloner<T extends Element>(
  template: keyof TemplateRegistry,
  fn: (node: Node | null) => node is T,
) {
  let cachedNode: T | null = null;
  return function getClone(): T {
    if (!cachedNode) {
      const { [template]: templateElement } = useTemplates(template);
      if (!(templateElement instanceof HTMLTemplateElement)) {
        throw new Error(`Element '${template}' is not a template.`);
      }
      const templateChild = templateElement.content.firstElementChild;
      if (!fn(templateChild)) {
        throw new Error(`Template '${template}' is missing.`);
      }
      cachedNode = templateChild;
    }
    const clonedNode = cachedNode.cloneNode(true);
    if (!fn(clonedNode)) {
      throw new Error(`Failed to clone template '${template}'.`);
    }
    return clonedNode;
  };
}

export {
  createGlobalSpinner,
  createTemplateCloner,
  createTooltipContent,
  isDiv,
};

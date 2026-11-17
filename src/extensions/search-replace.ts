import { MAX_SEARCH_LENGTH } from "@shared/shared-constants";
import { Extension, type CommandProps } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type DocSearchRange = { from: number; to: number; isNode?: boolean };

export type DocSearchOptions = {
  resultClass: string;
  activeResultClass: string;
  caseSensitive: boolean;
};

export type DocSearchStorage = {
  query: string;
  replacement: string;
  results: DocSearchRange[];
  activeIndex: number;
};

type PluginMeta = "search" | "navigate" | "clear";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    docSearch: {
      docSearchSetQuery: (query: string) => ReturnType;
      docSearchSetReplacement: (replacement: string) => ReturnType;
      docSearchClear: () => ReturnType;
      docSearchNext: () => ReturnType;
      docSearchPrev: () => ReturnType;
      docSearchReplaceCurrent: () => ReturnType;
      docSearchReplaceAll: () => ReturnType;
    };
  }
  interface Storage {
    docSearch: DocSearchStorage;
  }
}

const docSearchKey = new PluginKey<DecorationSet>("docSearch");

const createDecorations = (
  doc: EditorState["doc"],
  results: DocSearchRange[],
  activeIndex: number,
  options: DocSearchOptions,
) => {
  if (results.length === 0) return DecorationSet.empty;
  console.log(
    "RENDER DECORATIONS -> activeIndex:",
    activeIndex,
    "activeRange:",
    results[activeIndex],
    "all:",
    results,
  );
  return DecorationSet.create(
    doc,
    results.map((result, i) => {
      const className =
        i === activeIndex
          ? `${options.resultClass} ${options.activeResultClass}`
          : options.resultClass;

      return result.isNode
        ? Decoration.node(result.from, result.to, { class: className })
        : Decoration.inline(result.from, result.to, { class: className });
    }),
  );
};

function buildRegex(query: string, caseSensitive: boolean): RegExp | null {
  if (!query) return null;
  const flags = caseSensitive ? "g" : "gi";
  const isRegexLiteral = query.length > 2 && query.startsWith("/") && query.endsWith("/");
  if (isRegexLiteral) {
    const pattern = query.slice(1, -1);
    try {
      return new RegExp(pattern, flags);
    } catch {
      return null;
    }
  }
  return new RegExp(RegExp.escape(query), flags);
}

function getReplacement(
  doc: PMNode,
  result: DocSearchRange,
  query: string,
  replacement: string,
  caseSensitive: boolean,
): string {
  if (query.length <= 2 || !query.startsWith("/") || !query.endsWith("/")) {
    return replacement;
  }
  const regex = buildRegex(query, caseSensitive);
  return regex ? doc.textBetween(result.from, result.to).replace(regex, replacement) : replacement;
}

const getMatchesAndDecorations = (
  state: EditorState,
  storage: DocSearchStorage,
  options: DocSearchOptions,
) => {
  if (!storage.query || storage.query.length > MAX_SEARCH_LENGTH) {
    storage.activeIndex = -1;
    return { results: [], decorations: DecorationSet.empty };
  }
  const r = buildRegex(storage.query, options.caseSensitive ?? false);
  if (!r) {
    storage.activeIndex = -1;
    return { results: [], decorations: DecorationSet.empty };
  }
  const results: DocSearchRange[] = [];
  const { wikilink, noteTag } = state.schema.nodes;
  state.doc.descendants((node, pos) => {
    if (node.type.name === wikilink?.name || node.type.name === noteTag?.name) {
      const rawText = String(node.attrs["title"] ?? node.attrs["id"] ?? "");
      if (!rawText) return false;
      const searchableText = node.type.name === noteTag?.name ? `#${rawText}` : `[[${rawText}]]`;
      r.lastIndex = 0;
      if (r.test(searchableText)) {
        results.push({
          from: pos,
          to: pos + node.nodeSize,
          isNode: true,
        });
      }
      return false;
    }
    if (!node.isText || !node.text) return true;
    for (const match of node.text.matchAll(r)) {
      if (match[0].length === 0 || match.index === undefined) continue;
      results.push({
        from: pos + match.index,
        to: pos + match.index + match[0].length,
      });
    }
    return true;
  });
  if (results.length === 0) {
    storage.activeIndex = -1;
  } else if (storage.activeIndex < 0 || storage.activeIndex >= results.length) {
    storage.activeIndex = 0;
  }
  return {
    results,
    decorations: createDecorations(state.doc, results, storage.activeIndex, options),
  };
};

const scrollMatchIntoView = (editor: CommandProps["editor"], pos: number) => {
  requestAnimationFrame(() => {
    const scrollContainer = editor.view.dom.parentElement;
    if (!scrollContainer) return;
    const coords = editor.view.coordsAtPos(pos);
    const containerRect = scrollContainer.getBoundingClientRect();
    const padding = 60;
    const isVisible =
      coords.top >= containerRect.top + padding && coords.bottom <= containerRect.bottom - padding;
    if (!isVisible) {
      const matchCenter = (coords.top + coords.bottom) / 2;
      const containerCenter = containerRect.top + containerRect.height / 2;
      scrollContainer.scrollTop += matchCenter - containerCenter;
    }
  });
};

export const DocSearch = Extension.create<DocSearchOptions, DocSearchStorage>({
  name: "docSearch",
  addOptions() {
    return {
      resultClass: "doc-search-result",
      activeResultClass: "doc-search-result-active",
      caseSensitive: false,
    };
  },

  addStorage() {
    return { query: "", replacement: "", results: [], activeIndex: -1 };
  },

  addCommands() {
    return {
      docSearchSetQuery:
        (query) =>
        ({ editor, tr, dispatch }: CommandProps) => {
          editor.storage.docSearch.query = query;
          if (dispatch) {
            editor.storage.docSearch.query = query;
            editor.storage.docSearch.activeIndex = 0;
            tr.setMeta("docSearchRefresh", "search").setMeta("addToHistory", false);
          }
          return true;
        },
      docSearchSetReplacement:
        (replacement) =>
        ({ editor, dispatch }: CommandProps) => {
          if (dispatch) {
            editor.storage.docSearch.replacement = replacement;
          }
          return true;
        },
      docSearchClear:
        () =>
        ({ editor, tr, dispatch }: CommandProps) => {
          if (dispatch) {
            const storage = editor.storage.docSearch;
            storage.query = "";
            storage.replacement = "";
            storage.results = [];
            storage.activeIndex = -1;
            tr.setMeta("docSearchRefresh", "clear").setMeta("addToHistory", false);
          }
          return true;
        },
      docSearchNext:
        () =>
        ({ editor, tr, dispatch }: CommandProps) => {
          const s = editor.storage.docSearch;
          if (s.results.length === 0) return false;
          if (dispatch) {
            s.activeIndex = (s.activeIndex + 1) % s.results.length;
            const result = s.results[s.activeIndex];
            tr.setMeta("docSearchRefresh", "navigate").setMeta("addToHistory", false);
            if (result) scrollMatchIntoView(editor, result.from);
          }
          return true;
        },
      docSearchPrev:
        () =>
        ({ editor, tr, dispatch }: CommandProps) => {
          const s = editor.storage.docSearch;
          if (s.results.length === 0) return false;
          if (dispatch) {
            s.activeIndex = s.activeIndex <= 0 ? s.results.length - 1 : s.activeIndex - 1;
            const result = s.results[s.activeIndex];
            tr.setMeta("docSearchRefresh", "navigate").setMeta("addToHistory", false);
            if (result) scrollMatchIntoView(editor, result.from);
          }
          return true;
        },
      docSearchReplaceCurrent:
        () =>
        ({ editor, tr, dispatch }: CommandProps) => {
          const storage = editor.storage.docSearch;
          if (storage.activeIndex < 0) return false;
          const result = storage.results[storage.activeIndex];
          if (!result) return false;
          if (dispatch) {
            const text = getReplacement(
              tr.doc,
              result,
              storage.query,
              storage.replacement,
              this.options.caseSensitive ?? false,
            );
            tr.insertText(text, result.from, result.to);
          }
          return true;
        },
      docSearchReplaceAll:
        () =>
        ({ editor, tr, dispatch }: CommandProps) => {
          const storage = editor.storage.docSearch;
          const { results } = storage;
          if (results.length === 0) return false;
          if (dispatch) {
            for (let i = results.length - 1; i >= 0; i--) {
              const result = results[i];
              if (!result) continue;
              const text = getReplacement(
                tr.doc,
                result,
                storage.query,
                storage.replacement,
                this.options.caseSensitive ?? false,
              );
              tr.insertText(text, result.from, result.to);
            }
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { options } = this;
    return [
      new Plugin<DecorationSet>({
        key: docSearchKey,
        state: {
          init: (_, state) => {
            const storage = this.editor.storage.docSearch;
            const { results, decorations } = getMatchesAndDecorations(state, storage, options);
            storage.results = results;
            return decorations;
          },
          apply: (tr, oldSet, _oldState, newState) => {
            const storage = this.editor.storage.docSearch;
            const action = tr.getMeta("docSearchRefresh") as PluginMeta | undefined;
            if (action === "clear") {
              return DecorationSet.empty;
            }
            if (action === "navigate" && !tr.docChanged) {
              return createDecorations(newState.doc, storage.results, storage.activeIndex, options);
            }
            if (action === "search" || tr.docChanged) {
              const { results, decorations } = getMatchesAndDecorations(newState, storage, options);
              storage.results = results;
              return decorations;
            }
            return oldSet.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return docSearchKey.getState(state) ?? null;
          },
        },
      }),
    ];
  },
});

import { MAX_SEARCH_LENGTH } from "@shared/shared-constants";
import { Extension, type CommandProps } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type DocSearchRange = { from: number; to: number };

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

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createDecorations = (
  doc: EditorState["doc"],
  results: DocSearchRange[],
  activeIndex: number,
  options: DocSearchOptions,
) => {
  if (results.length === 0) return DecorationSet.empty;
  return DecorationSet.create(
    doc,
    results.map((result, i) =>
      Decoration.inline(result.from, result.to, {
        class:
          i === activeIndex
            ? `${options.resultClass} ${options.activeResultClass}`
            : options.resultClass,
      }),
    ),
  );
};

const getMatchesAndDecorations = (
  state: EditorState,
  storage: DocSearchStorage,
  options: DocSearchOptions,
) => {
  if (!storage.query || storage.query.length > MAX_SEARCH_LENGTH) {
    storage.activeIndex = -1;
    return { results: [], decorations: DecorationSet.empty };
  }
  const flags = options.caseSensitive ? "g" : "gi";
  const regex = new RegExp(escapeRegExp(storage.query), flags);
  const results: DocSearchRange[] = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    for (const match of node.text.matchAll(regex)) {
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
    decorations: createDecorations(
      state.doc,
      results,
      storage.activeIndex,
      options,
    ),
  };
};

const scrollMatchIntoView = (editor: CommandProps["editor"], pos: number) => {
  requestAnimationFrame(() => {
    const { node } = editor.view.domAtPos(pos);
    const el = node instanceof HTMLElement ? node : node.parentElement;
    el?.scrollIntoView({ behavior: "auto", block: "center" });
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
            tr.setMeta("docSearchRefresh", "search").setMeta(
              "addToHistory",
              false,
            );
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
            tr.setMeta("docSearchRefresh", "clear").setMeta(
              "addToHistory",
              false,
            );
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
            tr.setMeta("docSearchRefresh", "navigate").setMeta(
              "addToHistory",
              false,
            );
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
            s.activeIndex =
              s.activeIndex <= 0 ? s.results.length - 1 : s.activeIndex - 1;
            const result = s.results[s.activeIndex];
            tr.setMeta("docSearchRefresh", "navigate").setMeta(
              "addToHistory",
              false,
            );
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
            tr.insertText(storage.replacement, result.from, result.to);
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
              if (result) {
                tr.insertText(storage.replacement, result.from, result.to);
              }
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
            const { results, decorations } = getMatchesAndDecorations(
              state,
              storage,
              options,
            );
            storage.results = results;
            return decorations;
          },
          apply: (tr, oldSet, _oldState, newState) => {
            const storage = this.editor.storage.docSearch;
            if (!storage) return oldSet;
            const action = tr.getMeta("docSearchRefresh") as
              | PluginMeta
              | undefined;
            if (action === "clear") {
              return DecorationSet.empty;
            }
            if (action === "navigate" && !tr.docChanged) {
              return createDecorations(
                newState.doc,
                storage.results,
                storage.activeIndex,
                options,
              );
            }
            if (action === "search" || tr.docChanged) {
              const { results, decorations } = getMatchesAndDecorations(
                newState,
                storage,
                options,
              );
              storage.results = results;
              return decorations;
            }
            return oldSet;
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

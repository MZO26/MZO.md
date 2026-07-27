import { MAX_SEARCH_LENGTH } from "@shared/constants";
import { Extension, type CommandProps } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type DocSearchRange = { from: number; to: number };

export type DocSearchOptions = {
  resultClass: string;
  activeResultClass: string;
};

export type DocSearchStorage = {
  query: string;
  replacement: string;
  results: DocSearchRange[];
  activeIndex: number;
};

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

const getMatchesAndDecorations = (
  state: EditorState,
  storage: DocSearchStorage,
  options: DocSearchOptions,
) => {
  if (!storage.query || storage.query.length > MAX_SEARCH_LENGTH)
    return { results: [], decorations: DecorationSet.empty };
  const regex = new RegExp(escapeRegExp(storage.query), "gi");
  const results: DocSearchRange[] = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    let match: RegExpExecArray | null = null;
    regex.lastIndex = 0;
    while ((match = regex.exec(node.text)) !== null) {
      results.push({
        from: pos + match.index,
        to: pos + match.index + match[0].length,
      });
      if (match[0].length === 0) regex.lastIndex += 1;
    }
    return true;
  });
  if (results.length === 0) {
    storage.activeIndex = -1;
  } else if (storage.activeIndex < 0 || storage.activeIndex >= results.length) {
    storage.activeIndex = 0;
  }
  const decorations = DecorationSet.create(
    state.doc,
    results.map((result, i) =>
      Decoration.inline(result.from, result.to, {
        class:
          i === storage.activeIndex
            ? `${options.resultClass} ${options.activeResultClass}`
            : options.resultClass,
      }),
    ),
  );
  return { results, decorations };
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
        ({ editor, state, dispatch }: CommandProps) => {
          editor.storage.docSearch.query = query;
          const tr = state.tr;
          if (dispatch) dispatch(tr.setMeta("docSearchRefresh", true));
          return true;
        },
      docSearchSetReplacement:
        (replacement) =>
        ({ editor }: CommandProps) => {
          editor.storage.docSearch.replacement = replacement;
          return true;
        },
      docSearchClear:
        () =>
        ({ editor, state, dispatch }: CommandProps) => {
          const storage = editor.storage.docSearch;
          storage.query = "";
          storage.replacement = "";
          storage.results = [];
          storage.activeIndex = -1;
          const tr = state.tr;
          if (dispatch) dispatch(tr.setMeta("docSearchRefresh", true));
          return true;
        },
      docSearchNext:
        () =>
        ({ editor, state, dispatch }: CommandProps) => {
          const s = editor.storage.docSearch;
          if (s.results.length === 0) return false;
          s.activeIndex = (s.activeIndex + 1) % s.results.length;
          const result = s.results[s.activeIndex];
          if (!result) return false;
          const { from, to } = result;
          if (dispatch)
            dispatch(
              state.tr.setSelection(TextSelection.create(state.doc, from, to)),
            );
          return true;
        },
      docSearchPrev:
        () =>
        ({ editor, state, dispatch }: CommandProps) => {
          const storage = editor.storage.docSearch;
          const { results } = storage;
          if (results.length === 0) return false;
          storage.activeIndex =
            storage.activeIndex <= 0
              ? results.length - 1
              : storage.activeIndex - 1;
          const result = results[storage.activeIndex];
          if (!result) return false;
          const { from, to } = result;
          const tr = state.tr;
          if (dispatch)
            dispatch(
              tr.setSelection(TextSelection.create(state.doc, from, to)),
            );
          return true;
        },
      docSearchReplaceCurrent:
        () =>
        ({ editor, state, dispatch }: CommandProps) => {
          const storage = editor.storage.docSearch;
          if (storage.activeIndex < 0) return false;
          const result = storage.results[storage.activeIndex];
          if (!result) return false;
          const { from, to } = result;
          const tr = state.tr;
          if (dispatch) dispatch(tr.insertText(storage.replacement, from, to));
          return true;
        },
      docSearchReplaceAll:
        () =>
        ({ editor, state, dispatch }: CommandProps) => {
          const storage = editor.storage.docSearch;
          const { results } = storage;
          if (results.length === 0) return false;
          const tr = state.tr;
          for (let i = results.length - 1; i >= 0; i--) {
            const result = results[i];
            if (!result) return false;
            const { from, to } = result;
            tr.insertText(storage.replacement, from, to);
          }
          if (dispatch) dispatch(tr);
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
            return getMatchesAndDecorations(state, storage, options)
              .decorations;
          },
          apply: (tr, old, _oldState, newState) => {
            const storage = this.editor.storage.docSearch;
            if (!storage) return old;
            if (
              tr.docChanged ||
              tr.selectionSet ||
              tr.getMeta("docSearchRefresh")
            ) {
              const { results, decorations } = getMatchesAndDecorations(
                newState,
                storage,
                options,
              );
              storage.results = results;
              return decorations;
            }
            return old;
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

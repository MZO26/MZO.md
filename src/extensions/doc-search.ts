import type { SearchOptions } from "@shared/types";
import { Editor, Extension } from "@tiptap/core";
import {
  findNext,
  findPrev,
  getSearchState,
  replaceAll,
  replaceNext,
  search,
  SearchQuery,
  setSearchState,
} from "prosemirror-search";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchAndReplace: {
      setSearchTerm: (options?: SearchOptions) => ReturnType;
      clearSearch: () => ReturnType;
      findNext: () => ReturnType;
      findPrev: () => ReturnType;
      replaceNext: () => ReturnType;
      replaceAll: () => ReturnType;
    };
  }
}

type SearchAndReplaceStorage = {
  getState: (editor: Editor) => ReturnType<typeof getSearchState>;
};

const SearchAndReplace = Extension.create<{}, SearchAndReplaceStorage>({
  name: "searchAndReplace",

  addProseMirrorPlugins() {
    return [search()];
  },
  addStorage() {
    return {
      getState: (editor: Editor) => getSearchState(editor.state),
    };
  },

  addCommands() {
    return {
      setSearchTerm:
        (options: SearchOptions = {}) =>
        ({ tr, dispatch }) => {
          const query = new SearchQuery({
            search: options.searchTerm ?? "",
            replace: options.replaceTerm ?? "",
            caseSensitive: options.caseSensitive ?? false,
            wholeWord: options.wholeWord ?? false,
            regexp: options.regexp ?? false,
            literal: options.literal ?? false,
          });

          if (dispatch) {
            dispatch(setSearchState(tr, query));
          }

          return true;
        },

      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(
              setSearchState(tr, new SearchQuery({ search: "", replace: "" })),
            );
          }
          return true;
        },

      findNext:
        () =>
        ({ state, dispatch }) =>
          findNext(state, dispatch),

      findPrev:
        () =>
        ({ state, dispatch }) =>
          findPrev(state, dispatch),

      replaceNext:
        () =>
        ({ state, dispatch }) =>
          replaceNext(state, dispatch),

      replaceAll:
        () =>
        ({ state, dispatch }) =>
          replaceAll(state, dispatch),
    };
  },
});

export { SearchAndReplace };

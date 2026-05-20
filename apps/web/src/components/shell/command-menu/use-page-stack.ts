import { useCallback, useMemo, useReducer } from "react";

/** Every named sub-page in the command palette. Default view = empty stack. */
export type CommandPage =
  | "add-account"
  | "add-manual-account"
  | "add-position"
  | "add-tag"
  | "add-transaction"
  | "bulk-actions"
  | "bulk-add-tags"
  | "bulk-export"
  | "bulk-remove-tags"
  | "bulk-set-category"
  | "link-or-manual"
  | "manage-tags"
  | "search-chats"
  | "search-tickers"
  | "search-transactions"
  | "sell-position"
  | "settings";

type Action =
  | { type: "push"; page: CommandPage }
  | { type: "pop" }
  | { type: "replaceTop"; page: CommandPage }
  | { type: "openAt"; page: CommandPage }
  | { type: "clear" };

function reducer(state: CommandPage[], action: Action): CommandPage[] {
  switch (action.type) {
    case "push": {
      return [...state, action.page];
    }
    case "pop": {
      return state.slice(0, -1);
    }
    case "replaceTop": {
      return [...state.slice(0, -1), action.page];
    }
    case "openAt": {
      return [action.page];
    }
    case "clear": {
      return [];
    }
    default: {
      return state;
    }
  }
}

export interface PageStack {
  stack: CommandPage[];
  activePage: CommandPage | undefined;
  /** True when only the bottommost page is on the stack. */
  isRoot: boolean;
  push: (page: CommandPage) => void;
  pop: () => void;
  /** Swap the topmost page for another (e.g. link-or-manual → add-manual-account). */
  replaceTop: (page: CommandPage) => void;
  /** Reset the stack to a single page (used by external openX entry points). */
  openAt: (page: CommandPage) => void;
  clear: () => void;
}

export function usePageStack(): PageStack {
  const [stack, dispatch] = useReducer(reducer, []);

  const push = useCallback((page: CommandPage) => dispatch({ page, type: "push" }), []);
  const pop = useCallback(() => dispatch({ type: "pop" }), []);
  const replaceTop = useCallback((page: CommandPage) => dispatch({ page, type: "replaceTop" }), []);
  const openAt = useCallback((page: CommandPage) => dispatch({ page, type: "openAt" }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  return useMemo(
    () => ({
      activePage: stack.at(-1),
      clear,
      isRoot: stack.length <= 1,
      openAt,
      pop,
      push,
      replaceTop,
      stack,
    }),
    [stack, clear, openAt, pop, push, replaceTop],
  );
}

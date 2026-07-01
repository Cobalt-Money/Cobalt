/** Stable id for {@link SidebarShellLayout}'s main scroll container (TanStack Router). */
export const MAIN_SCROLL_RESTORATION_ID = "main-scrollable-area";

export const MAIN_SCROLL_RESTORATION_SELECTOR =
  `[data-scroll-restoration-id="${MAIN_SCROLL_RESTORATION_ID}"]` as const;

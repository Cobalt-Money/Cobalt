import { useMatches } from "@tanstack/react-router";

const DEFAULT_TITLE = "Cobalt";

/** Shell header title from the deepest match with `staticData.title`. */
export function useShellRouteTitle(): string {
  const matches = useMatches();
  for (const match of [...matches].toReversed()) {
    const title = match.staticData?.title;
    if (typeof title === "string" && title.length > 0) {
      return title;
    }
  }
  return DEFAULT_TITLE;
}

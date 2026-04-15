import type { LinkProps } from "@tanstack/react-router";
import { Link as TanStackLink } from "@tanstack/react-router";
import { useCallback } from "react";

import { useInstantNavigate } from "@/hooks/use-instant-navigate";

/**
 * Link component that prefetches on hover and navigates on mousedown.
 */
export function Link(props: LinkProps<"a">) {
  const { handleMouseDown: instantNavigate } = useInstantNavigate();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      instantNavigate(e, {
        hash: typeof props.hash === "string" ? props.hash : undefined,
        params: props.params as Record<string, string>,
        search: props.search as Record<string, string>,
        to: props.to as string,
      });
    },
    [props, instantNavigate]
  );

  return (
    <TanStackLink {...props} onMouseDown={handleMouseDown} preload="intent" />
  );
}

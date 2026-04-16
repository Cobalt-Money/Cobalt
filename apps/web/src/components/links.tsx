import type { LinkProps } from "@tanstack/react-router";
import { Link as TanStackLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";
import { useCallback } from "react";

import { useInstantNavigate } from "@/hooks/use-instant-navigate";

type CustomLinkProps = LinkProps<"a"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps<"a">>;

/**
 * Link component that prefetches on hover and navigates on mousedown.
 */
export function Link(props: CustomLinkProps) {
  const { handleMouseDown: instantNavigate } = useInstantNavigate();

  const { hash, params, search, to, ...restProps } = props;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      instantNavigate(e, {
        hash: typeof hash === "string" ? hash : undefined,
        params: params as Record<string, string>,
        search: search as Record<string, string>,
        to: to as string,
      });
    },
    [hash, params, search, to, instantNavigate]
  );

  return (
    <TanStackLink
      {...restProps}
      hash={hash}
      params={params}
      search={search}
      to={to}
      onMouseDown={handleMouseDown}
      preload="intent"
    />
  );
}

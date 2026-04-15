import { Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";

import { useInstantNavigate } from "@/hooks/use-instant-navigate";

export function InstantLink(props: LinkProps<"a">) {
  const { handleMouseDown } = useInstantNavigate();

  return (
    <Link
      {...props}
      onMouseDown={(e) => {
        handleMouseDown(e, {
          hash: typeof props.hash === "string" ? props.hash : undefined,
          params: props.params as Record<string, string>,
          search: props.search as Record<string, string>,
          to: props.to as string,
        });
      }}
    />
  );
}

import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";

export function InstantLink(props: LinkProps<"a">) {
  const navigate = useNavigate();
  const router = useRouter();

  const handleMouseDown = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Left click only, no modifier keys
    if (
      e.button === 0 &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      // Trigger intent/preload before navigating
      router.preloadRoute({
        params: props.params as Record<string, string>,
        search: props.search as Record<string, string>,
        to: props.to as string,
      });
      // Navigate immediately on mouse down
      navigate({
        hash: props.hash,
        params: props.params as Record<string, string>,
        search: props.search as Record<string, string>,
        to: props.to as string,
      });
    }
  };

  return <Link {...props} onMouseDown={handleMouseDown} />;
}

import { useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

interface NavigateOptions {
  hash?: string | undefined;
  params?: Record<string, string> | undefined;
  search?: Record<string, string> | undefined;
  to: string;
}

/**
 * Hook for instant navigation with mousedown support.
 * Preloads and navigates on left-click without modifier keys.
 */
export function useInstantNavigate() {
  const navigate = useNavigate();
  const router = useRouter();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, options: NavigateOptions) => {
      if (e.button === 0 && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        router.preloadRoute({
          hash: options.hash,
          params: options.params as Record<string, string>,
          search: options.search as Record<string, string>,
          to: options.to,
        });
        navigate({
          hash: options.hash,
          params: options.params as Record<string, string>,
          search: options.search as Record<string, string>,
          to: options.to,
        });
      }
    },
    [navigate, router],
  );

  return { handleMouseDown };
}

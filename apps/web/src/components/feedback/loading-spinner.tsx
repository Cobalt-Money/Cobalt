import { Spinner } from "@cobalt-web/ui/components/spinner";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useEffect, useState } from "react";

/**
 * Mirrors Rocicorp zbugs `mono/apps/zbugs/src/components/loading-spinner.tsx`:
 * defer showing the spinner by {@link ZBUGS_LOADING_SPINNER_DELAY_MS} so fast loads
 * never flash a loading UI (same perf/UX tradeoff as zbugs).
 */
export const ZBUGS_LOADING_SPINNER_DELAY_MS = 500;

interface LoadingSpinnerProps {
  /** When true, skip the delay and show immediately (zbugs `forceShow`). */
  forceShow?: boolean | undefined;
  /**
   * When true, stay in normal flow inside a full-screen parent (no fixed viewport
   * positioning). Use with {@link ZeroProvider} shell so the glyph does not pop in
   * at a second fixed layer.
   */
  embedded?: boolean | undefined;
}

export function LoadingSpinner({ forceShow, embedded }: LoadingSpinnerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, ZBUGS_LOADING_SPINNER_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  if (!show && !forceShow) {
    return null;
  }

  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center gap-2 text-sm",
        embedded
          ? "relative"
          : "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
      )}
      role="status"
    >
      <Spinner className="size-5" />
      <span>Just a moment…</span>
    </div>
  );
}

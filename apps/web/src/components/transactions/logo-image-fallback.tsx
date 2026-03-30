import { cn } from "@cobalt-web/ui/lib/utils";
import { useEffect, useState } from "react";

interface LogoImageWithFallbackProps {
  alt: string;
  candidates: string[];
  /** Applied to `<img>` (e.g. object-contain vs object-cover). */
  imgClassName: string;
  /**
   * Shown when every candidate fails to load (LogoCDN-style letter fallback).
   * @see https://docs.brandfetch.com/guides/customize-logo-api-fallback
   */
  fallbackText?: string;
  /** Wrapper — default `size-6` for transaction table cells. */
  className?: string;
}

/**
 * Tries each `candidates` URL in order; on `error`, advances to the next.
 * Uses opacity + circular chip (dark tint in light mode, light tint in dark mode); optional
 * `fallbackText` when all URLs fail (Brandfetch customize-fallback guide).
 */
export function LogoImageWithFallback({
  alt,
  candidates,
  imgClassName,
  fallbackText,
  className,
}: LogoImageWithFallbackProps) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [index]);

  const exhausted = candidates.length === 0 || index >= candidates.length;

  if (exhausted) {
    if (fallbackText?.trim()) {
      const letter = fallbackText.trim().slice(0, 3);
      return (
        <div
          aria-label={alt.trim() || "Logo"}
          className={cn(
            "flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-900/20 text-[10px] font-semibold leading-none text-zinc-100 dark:bg-zinc-100/50 dark:text-zinc-900",
            className
          )}
          role="img"
        >
          {letter}
        </div>
      );
    }
    return <div className={cn("size-6 shrink-0 rounded-full", className)} />;
  }

  const src = candidates[index];

  return (
    <div
      className={cn(
        "relative size-6 shrink-0 overflow-hidden rounded-full bg-zinc-900/15 dark:bg-zinc-100/35",
        className
      )}
    >
      <img
        alt={alt.trim() || "Logo"}
        className={cn(
          "absolute inset-0 size-full transition-opacity duration-150",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName
        )}
        decoding="async"
        src={src}
        onError={() => {
          setIndex((i) => i + 1);
        }}
        onLoad={() => {
          setLoaded(true);
        }}
      />
    </div>
  );
}

import { cn } from "@cobalt-web/ui/lib/utils";
import { useState } from "react";

interface LogoImageWithFallbackProps {
  alt: string;
  candidates: string[];
  /** Applied to `<img>` (e.g. object-contain vs object-cover). */
  imgClassName: string;
  /**
   * Shown when every candidate fails to load: first initial of this string (Brandfetch
   * `fallback=lettermark` uses the brand first letter; we mirror that locally).
   * @see https://docs.brandfetch.com/guides/customize-logo-api-fallback
   */
  fallbackText?: string;
  /** Wrapper — default `size-5` for transaction table cells. */
  className?: string;
}

function firstInitial(text: string): string {
  const t = text.trim();
  return t ? ([...t][0] ?? "").toUpperCase() : "";
}

function letterFallbackClassName(): string {
  // bg-current/text-current = inherit color from parent so the chip adapts to
  // light/dark glass panels without relying on Tailwind's `dark:` class.
  return "flex size-full items-center justify-center rounded-full bg-current/15 text-current text-[9px] font-semibold leading-none";
}

/** Tries `candidates` in order; on `error`, advances to the next. */
export function LogoImageWithFallback({
  alt,
  candidates,
  imgClassName,
  fallbackText,
  className,
}: LogoImageWithFallbackProps) {
  const [index, setIndex] = useState(0);
  // React docs pattern: reset state during render when a prop changes.
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevCandidates, setPrevCandidates] = useState(candidates);
  if (prevCandidates !== candidates) {
    setPrevCandidates(candidates);
    setIndex(0);
  }

  const exhausted = candidates.length === 0 || index >= candidates.length;
  const letter = fallbackText?.trim() ? firstInitial(fallbackText) : "";

  if (exhausted) {
    if (letter) {
      return (
        <span
          aria-label={alt.trim() || undefined}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center overflow-hidden",
            className,
          )}
        >
          <span aria-hidden className={letterFallbackClassName()}>
            {letter}
          </span>
        </span>
      );
    }
    return <div className={cn("size-5 shrink-0 rounded-full", className)} />;
  }

  return (
    <div
      className={cn(
        "relative size-5 shrink-0 overflow-hidden rounded-full bg-zinc-900/15 dark:bg-zinc-100/35",
        className,
      )}
    >
      {letter ? (
        <span aria-hidden className={cn(letterFallbackClassName(), "absolute inset-0 z-0")}>
          {letter}
        </span>
      ) : null}
      <img
        alt={alt.trim() || "Logo"}
        className={cn("absolute inset-0 z-10 size-full", imgClassName)}
        decoding="async"
        fetchPriority="low"
        loading="lazy"
        src={candidates[index]}
        onError={() => setIndex(index + 1)}
      />
    </div>
  );
}

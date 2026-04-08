import { cn } from "@cobalt-web/ui/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

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
  /**
   * Avoid doing any remote image work until the chip is near viewport.
   * Greatly reduces the logo-request burst for long lists.
   */
  deferUntilVisible?: boolean;
}

type LogoLoadState = "success" | "fail";

const logoUrlState = new Map<string, LogoLoadState>();
const logoUrlResolved = new Map<string, string>();

function compactCacheIfNeeded() {
  // Keep this tiny and simple; we only need to avoid repeat work within a session.
  const max = 5000;
  if (logoUrlState.size <= max) {
    return;
  }
  const toDelete = Math.max(100, logoUrlState.size - max);
  let i = 0;
  for (const key of logoUrlState.keys()) {
    logoUrlState.delete(key);
    logoUrlResolved.delete(key);
    i += 1;
    if (i >= toDelete) {
      break;
    }
  }
}

function stableKeyFromCandidates(candidates: string[]): string {
  return candidates.join("|");
}

/** First character of `text` (Unicode code points), for lettermark-style chips. */
function firstInitial(text: string): string {
  const t = text.trim();
  if (!t) {
    return "";
  }
  return [...t][0] ?? "";
}

function letterFallbackClassName(): string {
  return "flex size-full items-center justify-center rounded-full bg-zinc-900/20 text-[9px] font-semibold leading-none text-zinc-100 dark:bg-zinc-100/50 dark:text-zinc-900";
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
  deferUntilVisible = true,
}: LogoImageWithFallbackProps) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(!deferUntilVisible);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const key = useMemo(() => stableKeyFromCandidates(candidates), [candidates]);

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [key]);

  useEffect(() => {
    if (!deferUntilVisible) {
      return;
    }
    if (visible) {
      return;
    }
    const el = rootRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const margin = 300;
    const vh = window.innerHeight;
    const inView = rect.top < vh + margin && rect.bottom > -margin;
    if (inView) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: `${margin}px` }
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [deferUntilVisible, visible]);

  useEffect(() => {
    setLoaded(false);
  }, [index]);

  const exhausted = candidates.length === 0 || index >= candidates.length;

  if (exhausted) {
    if (fallbackText?.trim()) {
      const letter = firstInitial(fallbackText);
      return (
        <div
          aria-label={alt.trim() || "Logo"}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center overflow-hidden",
            className
          )}
          role="img"
        >
          <span className={letterFallbackClassName()}>{letter}</span>
        </div>
      );
    }
    return <div className={cn("size-5 shrink-0 rounded-full", className)} />;
  }

  const resolved = logoUrlResolved.get(key);
  const src = resolved ?? candidates[index];
  const canLoad = visible;
  const letter = fallbackText?.trim() ? firstInitial(fallbackText) : "";
  const showLetterUnderlay = Boolean(letter);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative size-5 shrink-0 overflow-hidden rounded-full bg-zinc-900/15 dark:bg-zinc-100/35",
        className
      )}
    >
      {showLetterUnderlay ? (
        <span
          aria-hidden
          className={cn(letterFallbackClassName(), "absolute inset-0 z-0")}
        >
          {letter}
        </span>
      ) : null}
      <img
        alt={alt.trim() || "Logo"}
        className={cn(
          "absolute inset-0 z-10 size-full transition-opacity duration-150",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName
        )}
        decoding="async"
        fetchPriority="low"
        loading="lazy"
        src={canLoad ? src : undefined}
        onError={() => {
          if (src) {
            logoUrlState.set(src, "fail");
            compactCacheIfNeeded();
            console.warn("[logo] failed to load:", src);
          }

          const cachedOk = logoUrlResolved.get(key);
          if (cachedOk !== undefined && src === cachedOk) {
            logoUrlResolved.delete(key);
          }

          let next = index + 1;
          while (next < candidates.length) {
            const u = candidates[next];
            if (u !== undefined && logoUrlState.get(u) !== "fail") {
              break;
            }
            next += 1;
          }
          if (next >= candidates.length) {
            console.warn(
              "[logo] all candidates exhausted for:",
              alt,
              candidates
            );
          }
          setIndex(next);
        }}
        onLoad={() => {
          setLoaded(true);
          if (src) {
            logoUrlState.set(src, "success");
            console.info("[logo] loaded:", src);
          }
          if (!resolved && src) {
            logoUrlResolved.set(key, src);
            compactCacheIfNeeded();
          }
        }}
      />
    </div>
  );
}

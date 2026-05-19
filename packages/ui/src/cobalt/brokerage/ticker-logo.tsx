import { env } from "@cobalt-web/env/web";
import { cn } from "@cobalt-web/ui/lib/utils";

import { TickerLogoCDN } from "../logos/ticker-logo-cdn";

/**
 * Circular ticker logo via Brandfetch **`ticker/`** CDN when `VITE_BRANDFETCH_CLIENT_ID` is set
 * and the symbol looks like a valid ticker; otherwise a lettermark chip.
 */
export function TickerLogo({
  symbol,
  className,
  size = 40,
}: {
  symbol: string;
  className?: string;
  /** Edge length in px (default 40). */
  size?: number;
}) {
  const raw = symbol.trim().toUpperCase();
  const letter = raw.slice(0, 1) || "?";
  const clientId = env.VITE_BRANDFETCH_CLIENT_ID;

  if (clientId) {
    return (
      <div className={cn("shrink-0", className)} style={{ height: size, width: size }}>
        <TickerLogoCDN
          alt={`${raw} logo`}
          className="ring-border/60 size-full overflow-hidden rounded-full ring-1"
          clientId={clientId}
          fallbackText={letter}
          logoApiSize={Math.max(64, size * 2)}
          symbol={raw}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "ring-border/60 flex shrink-0 items-center justify-center rounded-full bg-muted ring-1",
        className,
      )}
      style={{ height: size, width: size }}
    >
      <span className="text-muted-foreground text-[11px] font-semibold tracking-tight">
        {letter}
      </span>
    </div>
  );
}

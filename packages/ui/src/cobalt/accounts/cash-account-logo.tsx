import { cn } from "@cobalt-web/ui/lib/utils";

const CASH_ICON_URL = new URL("../../assets/vectors/cash.svg", import.meta.url).href;

/** Cream tile with `cash.svg` glyph. Used for manual cash accounts. */
export function CashAccountLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-amber-50",
        className,
      )}
    >
      <img alt="" aria-hidden className="size-[70%] object-contain" src={CASH_ICON_URL} />
    </div>
  );
}

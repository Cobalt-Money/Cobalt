import { cn } from "@cobalt-web/ui/lib/utils";

/** Cream tile with `cash.svg` glyph. Used for manual cash accounts. */
export function CashAccountLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-amber-50",
        className
      )}
    >
      <img
        alt=""
        aria-hidden
        className="size-[70%] object-contain"
        src="/assets/vectors/cash.svg"
      />
    </div>
  );
}

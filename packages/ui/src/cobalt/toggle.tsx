import { Toggle, toggleVariants } from "@cobalt-web/ui/components/toggle";
import { cn } from "@cobalt-web/ui/lib/utils";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

/**
 * Product-level toggle chrome: muted label, mixed hover between muted and
 * selected fills, stronger pressed state, outline hairline + shadow.
 * Prefer this in app UI; keep {@link Toggle} for stock / showcase.
 */
const cobaltToggleChrome =
  "font-normal text-muted-foreground hover:bg-[color-mix(in_oklch,var(--color-muted),var(--color-input)_50%)] hover:text-foreground dark:hover:bg-[color-mix(in_oklch,var(--color-muted),var(--color-accent)_50%)] aria-pressed:bg-input aria-pressed:text-foreground aria-pressed:hover:bg-input dark:aria-pressed:bg-accent dark:aria-pressed:hover:bg-accent";

const cobaltToggleOutlineChrome = "border-[0.5px] border-border shadow-xs";

export type CobaltToggleProps = ComponentProps<typeof Toggle>;

function CobaltToggle({ className, variant = "default", ...props }: CobaltToggleProps) {
  return (
    <Toggle
      className={cn(
        cobaltToggleChrome,
        variant === "outline" && cobaltToggleOutlineChrome,
        className,
      )}
      variant={variant}
      {...props}
    />
  );
}

export { CobaltToggle, cobaltToggleChrome, cobaltToggleOutlineChrome, toggleVariants };
export type { VariantProps };

import { Button, buttonVariants } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

/**
 * Classes applied to every Cobalt button on top of the stock {@link Button} styles.
 * Strips motion from the base primitive (`transition-all`, `active:translate-y-px`).
 * Add more product-level overrides here as the design system grows.
 */
const cobaltButtonChrome = "transition-none active:translate-y-0";

export type CobaltButtonProps = ComponentProps<typeof Button>;

/**
 * App-facing button: same variants and sizes as {@link Button}, with Cobalt chrome
 * (no stock press/transition animation). Prefer this import in app code when
 * building the Cobalt look; keep {@link Button} for untouched shadcn behavior.
 */
function CobaltButton({ className, ...props }: CobaltButtonProps) {
  return <Button className={cn(cobaltButtonChrome, className)} {...props} />;
}

export { CobaltButton, buttonVariants, cobaltButtonChrome };
export type { VariantProps };

import { PromptInput } from "@cobalt-web/ui/components/ai-elements/prompt-input";
import type { PromptInputProps } from "@cobalt-web/ui/components/ai-elements/prompt-input";
import { cn } from "@cobalt-web/ui/lib/utils";

/**
 * Product chrome on top of the stock `PromptInput` `InputGroup`: no border,
 * shadow, or focus ring — same ghost fill as `AccountCard`.
 */
export const cobaltPromptInputChrome =
  "border-0 bg-[oklch(0.949_0_0)] shadow-none ring-0 dark:bg-[oklch(0.29_0_0)] has-[[data-slot=input-group-control]:focus-visible]:border-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-[[data-slot][aria-invalid=true]]:border-transparent has-[[data-slot][aria-invalid=true]]:ring-0 dark:has-[[data-slot][aria-invalid=true]]:ring-0";

/**
 * User message bubble: same ghost fill and radius as the composer `InputGroup`
 * (`rounded-2xl` matches the textarea + footer shell).
 */
export const cobaltPromptUserBubbleClass =
  "group-[.is-user]:rounded-2xl group-[.is-user]:bg-[oklch(0.949_0_0)] dark:group-[.is-user]:bg-white/[0.06]";

export type CobaltPromptInputProps = PromptInputProps;

/**
 * App-facing prompt field: same API as `PromptInput`, with Cobalt surface
 * treatment (borderless, no shadow). Prefer this in product chat UIs; keep
 * `PromptInput` for stock ai-elements behavior.
 */
function CobaltPromptInput({ className, inputGroupClassName, ...props }: CobaltPromptInputProps) {
  return (
    <PromptInput
      className={className}
      inputGroupClassName={cn(cobaltPromptInputChrome, inputGroupClassName)}
      {...props}
    />
  );
}

export { CobaltPromptInput };

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cn } from "@cobalt-web/ui/lib/utils";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-4xl text-sm font-normal whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-[color-mix(in_oklch,var(--color-muted),var(--color-input)_50%)] hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-input aria-pressed:text-foreground aria-pressed:hover:bg-input dark:hover:bg-[color-mix(in_oklch,var(--color-muted),var(--color-accent)_50%)] dark:aria-invalid:ring-destructive/40 dark:aria-pressed:bg-accent dark:aria-pressed:hover:bg-accent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default:
          "h-9 min-w-9 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        sm: "h-8 min-w-8 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-10 min-w-10 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
      },
      variant: {
        default: "bg-transparent",
        outline:
          "border-[0.5px] border-border bg-transparent shadow-xs hover:bg-muted",
        subtle:
          "h-7 min-w-7 gap-2 border border-dashed border-muted-foreground/40 bg-input/30 hover:bg-input/50 dark:hover:bg-input/50",
      },
    },
  }
);

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ className, size, variant }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };

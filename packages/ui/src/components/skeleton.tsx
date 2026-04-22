import { cn } from "@cobalt-web/ui/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-xl bg-foreground/10", className)}
      {...props}
    />
  );
}

export { Skeleton };

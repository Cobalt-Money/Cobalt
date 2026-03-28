// @ts-nocheck
import { cn } from "@cobalt-web/ui/lib/utils";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <HugeiconsIcon
      icon={Loading03Icon}
      strokeWidth={2}
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };

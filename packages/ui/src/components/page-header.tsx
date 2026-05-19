import { cn } from "@cobalt-web/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

type PageHeaderProps = ComponentProps<"div"> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  size?: "default" | "sm" | "lg";
};

const titleSize = {
  sm: "text-xl font-semibold",
  default: "text-2xl font-semibold",
  lg: "text-3xl font-semibold",
};

function PageHeader({
  title,
  description,
  actions,
  size = "default",
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn("flex items-start justify-between gap-4", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className={cn(titleSize[size], "tracking-tight")}>{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export { PageHeader };
export type { PageHeaderProps };

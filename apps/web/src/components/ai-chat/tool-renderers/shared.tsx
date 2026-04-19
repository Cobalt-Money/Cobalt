import { toolRendererKey } from "./types";
import type { ToolRendererContext } from "./types";

export function ToolLoadingSkeleton({
  context,
  variant = "default",
}: {
  context: ToolRendererContext;
  variant?: "default" | "company";
}) {
  const key = toolRendererKey(
    context,
    variant === "company" ? "loading-company" : "loading"
  );
  if (variant === "company") {
    return (
      <div key={key} className="pb-4">
        <div className="p-6 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1">
              <div className="h-8 bg-muted animate-pulse rounded w-48 mb-2" />
              <div className="flex gap-2">
                <div className="h-6 bg-muted animate-pulse rounded w-16" />
                <div className="h-6 bg-muted animate-pulse rounded w-20" />
                <div className="h-6 bg-muted animate-pulse rounded w-24" />
              </div>
            </div>
            <div className="text-right">
              <div className="h-8 bg-muted animate-pulse rounded w-24" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded w-full" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div key={key} className="pb-4">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
        <div className="flex-1">
          <div className="h-6 bg-muted animate-pulse rounded w-24 mb-2" />
          <div className="h-4 bg-muted animate-pulse rounded w-32" />
        </div>
        <div className="text-right">
          <div className="h-8 bg-muted animate-pulse rounded w-20 mb-1" />
          <div className="h-4 bg-muted animate-pulse rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export function ToolErrorCard({
  context,
  title,
  errorText,
  suffix = "error",
}: {
  context: ToolRendererContext;
  title: string;
  errorText?: string;
  suffix?: string;
}) {
  const key = toolRendererKey(context, suffix);
  return (
    <div key={key} className="pb-4">
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <div className="flex items-center gap-2 text-destructive">
          <span className="font-medium">{title}</span>
        </div>
        {errorText && (
          <div className="text-sm text-destructive/80 mt-1">{errorText}</div>
        )}
      </div>
    </div>
  );
}

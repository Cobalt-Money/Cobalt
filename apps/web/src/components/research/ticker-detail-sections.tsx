import { cn } from "@cobalt-web/ui/lib/utils";

export function TickerDetailAbout({ description }: { description: string }) {
  const trimmed = description.trim();
  const hasBody = trimmed.length > 0;

  return (
    <section className="w-full min-w-0">
      <h2 className="font-normal text-muted-foreground text-xs">Description</h2>
      <p
        className={cn(
          "mt-1 text-sm leading-relaxed",
          hasBody ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {hasBody ? trimmed : "No company description available."}
      </p>
    </section>
  );
}

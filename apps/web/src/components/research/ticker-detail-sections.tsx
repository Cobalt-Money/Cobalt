import { cn } from "@cobalt-web/ui/lib/utils";

export function TickerDetailAbout({ description }: { description: string }) {
  const trimmed = description.trim();
  const hasBody = trimmed.length > 0;

  return (
    <section className="w-full min-w-0">
      <h2 className="font-semibold text-foreground text-lg tracking-tight sm:text-xl">
        Description
      </h2>
      <p
        className={cn(
          "mt-3 text-base leading-relaxed sm:text-[1.0625rem]",
          hasBody ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {hasBody ? trimmed : "No company description available."}
      </p>
    </section>
  );
}

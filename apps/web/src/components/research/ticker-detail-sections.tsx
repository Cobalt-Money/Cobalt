export function TickerDetailAbout({ description }: { description: string }) {
  return (
    <section className="w-full min-w-0">
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description || "No company description available."}
      </p>
    </section>
  );
}

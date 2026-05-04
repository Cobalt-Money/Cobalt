import { cn } from "@cobalt-web/ui/lib/utils";

export interface KeyMetricRow {
  href?: string;
  label: string;
  value: string;
}

export function TickerKeyMetrics({ rows }: { rows: readonly KeyMetricRow[] }) {
  return (
    <section aria-label="Key metrics" className="w-full min-w-0">
      <h2 className="font-semibold text-foreground text-lg tracking-tight sm:text-xl">
        Key metrics
      </h2>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => (
          <div className="min-w-0" key={row.label}>
            <dt className="text-muted-foreground text-sm font-medium leading-snug">{row.label}</dt>
            <dd className="mt-1.5 min-w-0">
              {row.href ? (
                <a
                  className="text-primary font-semibold text-base leading-snug underline-offset-4 hover:underline sm:text-lg"
                  href={row.href}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {row.value}
                </a>
              ) : (
                <p
                  className={cn(
                    "font-semibold text-foreground text-base tabular-nums leading-snug sm:text-lg",
                    row.label === "CEO" || row.label === "Sector" || row.label === "Industry"
                      ? "break-words"
                      : "",
                  )}
                  title={
                    row.label === "CEO" || row.label === "Industry" || row.label === "Sector"
                      ? row.value
                      : undefined
                  }
                >
                  {row.value}
                </p>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const POINTS: { title: string; body: string }[] = [
  {
    body: "Banks, cards, and brokerages — all in one calm dashboard.",
    title: "One place for your money",
  },
  {
    body: "Ask questions in plain English. Get summaries, trends, and answers.",
    title: "AI that actually helps",
  },
  {
    body: "Cobalt can see your accounts. It can never move your money.",
    title: "Read-only by design",
  },
  {
    body: "AGPL-licensed. Inspect the code, see exactly what we do with your data.",
    title: "Open source, transparent",
  },
];

export function AboutStep() {
  return (
    <div className="flex w-full flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="font-semibold text-2xl tracking-tight">What is Cobalt?</h1>
        <p className="max-w-sm text-muted-foreground">
          A personal finance command center built for clarity, not clutter.
        </p>
      </div>
      <ul className="flex w-full flex-col gap-2 text-left">
        {POINTS.map((p) => (
          <li className="rounded-lg border border-border bg-muted/30 p-3" key={p.title}>
            <div className="font-medium text-sm">{p.title}</div>
            <div className="text-muted-foreground text-xs">{p.body}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

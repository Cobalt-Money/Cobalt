import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/transactions/recurring")({
  component: RecurringPage,
});

function RecurringPage() {
  const [rows] = useQuery(queries.transactions.recurring());

  return (
    <div className="space-y-2">
      <h1 className="text-lg font-medium">Recurring</h1>
      <p className="text-muted-foreground text-sm">
        {rows.length} active streams
      </p>
      <ul className="font-mono text-xs">
        {rows.map((row) => (
          <li className="border-b py-1" key={row.id}>
            {row.description} · {row.merchantName ?? "—"} · last {row.lastDate}{" "}
            · {row.lastAmount}
          </li>
        ))}
      </ul>
    </div>
  );
}

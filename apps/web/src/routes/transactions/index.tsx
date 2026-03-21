import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/transactions/")({
  component: TransactionsListPage,
});

function formatDate(ms: number): string {
  try {
    return new Date(ms).toISOString().split("T")[0] ?? String(ms);
  } catch {
    return String(ms);
  }
}

function TransactionsListPage() {
  const [rows] = useQuery(queries.transactions.list());

  return (
    <div className="space-y-2">
      <h1 className="text-lg font-medium">Transactions</h1>
      <p className="text-muted-foreground text-sm">
        {rows.length} rows (max 100)
      </p>
      <ul className="font-mono text-xs">
        {rows.map((row) => (
          <li className="border-b py-1" key={row.id}>
            {formatDate(row.date)} · {row.name} · {row.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}

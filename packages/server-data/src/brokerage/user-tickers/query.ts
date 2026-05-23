import { db } from "@cobalt-web/db";

export async function getUserTickers(userId: string): Promise<string[]> {
  const rows = await db.query.holding.findMany({
    columns: {},
    where: {
      security: { tickerSymbol: { isNotNull: true } },
      userId: { eq: userId },
    },
    with: {
      security: { columns: { tickerSymbol: true } },
    },
  });

  const symbols = rows
    .map((r) => r.security.tickerSymbol)
    .filter((s): s is string => typeof s === "string" && s !== "");
  return [...new Set(symbols)].toSorted((a, b) => a.localeCompare(b));
}

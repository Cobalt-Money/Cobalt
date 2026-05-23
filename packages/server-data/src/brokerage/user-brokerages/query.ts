import { db } from "@cobalt-web/db";

export async function getUserBrokerages(userId: string): Promise<string[]> {
  const rows = await db.query.financialAccount.findMany({
    columns: {
      institutionName: true,
      source: true,
      type: true,
    },
    where: {
      OR: [
        { institutionName: { isNotNull: true } },
        { plaidConnection: { institutionName: { isNotNull: true } } },
      ],
      userId: { eq: userId },
    },
    with: {
      plaidConnection: {
        columns: { institutionName: true },
      },
    },
  });

  const names = rows
    .map((r) => {
      // Plaid + manual: only investment accounts count as brokerages.
      if ((r.source === "plaid" || r.source === "manual") && r.type !== "investment") {
        return null;
      }
      return r.institutionName ?? r.plaidConnection?.institutionName ?? null;
    })
    .filter((n): n is string => typeof n === "string" && n !== "");
  return [...new Set(names)].toSorted((a, b) => a.localeCompare(b));
}

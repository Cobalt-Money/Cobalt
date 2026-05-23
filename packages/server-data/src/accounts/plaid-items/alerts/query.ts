import { db } from "@cobalt-web/db";

import type { PlaidItemAlert } from "./schema.js";

export async function getPlaidItemAlerts(userId: string): Promise<PlaidItemAlert[]> {
  const items = await db.query.plaidConnection.findMany({
    columns: {
      error: true,
      institutionLogo: true,
      institutionName: true,
      newAccountsAvailable: true,
      pendingDisconnectAt: true,
      plaidItemId: true,
    },
    where: {
      OR: [{ error: { isNotNull: true } }, { pendingDisconnectAt: { isNotNull: true } }],
      userId: { eq: userId },
    },
  });

  return items.map((item) => ({
    institutionLogo: item.institutionLogo ?? null,
    institutionName: item.institutionName ?? "Unknown Bank",
    needsReauth: item.error !== null,
    newAccountsAvailable: item.newAccountsAvailable ?? false,
    pendingDisconnectAt: item.pendingDisconnectAt?.toISOString() ?? null,
    plaidItemId: item.plaidItemId,
  }));
}

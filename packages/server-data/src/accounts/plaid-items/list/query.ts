import { db } from "@cobalt-web/db";

import type { PlaidItemResponse } from "../_shared.js";

export async function getPlaidItems(userId: string): Promise<PlaidItemResponse[]> {
  const items = await db.query.plaidConnection.findMany({
    where: { userId: { eq: userId } },
  });

  return items.map((item) => ({
    availableProducts: item.availableProducts ?? null,
    billedProducts: item.billedProducts ?? null,
    createdAt: item.createdAt.toISOString(),
    error: item.error ?? null,
    id: item.id,
    institutionId: item.institutionId,
    institutionLogo: item.institutionLogo,
    institutionName: item.institutionName,
    newAccountsAvailable: item.newAccountsAvailable,
    pendingDisconnectAt: item.pendingDisconnectAt?.toISOString() ?? null,
    plaidItemId: item.plaidItemId,
    updatedAt: item.updatedAt.toISOString(),
    userId: item.userId,
  }));
}

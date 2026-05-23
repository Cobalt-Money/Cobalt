import { db } from "@cobalt-web/db";

import { ApiError } from "../../_shared/api-error.js";
import type { ManualHoldingResponse } from "./schemas.js";

/**
 * Single manual holding owned by `userId`. Inline ownership in WHERE — no
 * separate assert helper.
 */
export async function getManualHoldingDetail(
  userId: string,
  holdingId: string,
): Promise<ManualHoldingResponse> {
  const row = await db.query.holding.findFirst({
    columns: {
      accountId: true,
      averagePrice: true,
      costBasis: true,
      currency: true,
      id: true,
      institutionPrice: true,
      institutionPriceAsOf: true,
      institutionValue: true,
      quantity: true,
      securityId: true,
      updatedAt: true,
    },
    where: {
      id: { eq: holdingId },
      source: { eq: "manual" },
      userId: { eq: userId },
    },
    with: {
      security: { columns: { tickerSymbol: true } },
    },
  });
  if (!row) {
    throw new ApiError(404, "holding_not_found", "Holding not found");
  }
  return {
    accountId: row.accountId,
    averagePrice: row.averagePrice,
    costBasis: row.costBasis,
    currency: row.currency,
    id: row.id,
    institutionPrice: row.institutionPrice,
    institutionPriceAsOf: row.institutionPriceAsOf,
    institutionValue: row.institutionValue,
    quantity: row.quantity,
    securityId: row.securityId,
    ticker: row.security?.tickerSymbol ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

import type { Account } from "snaptrade-typescript-sdk";

import { serializeJsonb } from "../lib.js";

/** Map a SnapTrade Account into the `brokerage_account_details` row shape. */
export function buildAccountDetailsFields(
  detailsData: Account,
  appUserId: string,
  snaptradeAccountId: string
) {
  return {
    balance: serializeJsonb(detailsData.balance ?? null),
    brokerageAuthorizationId: detailsData.brokerage_authorization ?? "",
    cashRestrictions: serializeJsonb(detailsData.cash_restrictions ?? null),
    createdDate: detailsData.created_date
      ? new Date(detailsData.created_date)
      : new Date(),
    institutionName: detailsData.institution_name ?? "Unknown",
    lastSync: new Date(),
    meta: serializeJsonb(detailsData.meta ?? null),
    name: detailsData.name ?? "Account",
    number: detailsData.number ?? null,
    portfolioGroup: detailsData.portfolio_group ?? null,
    rawType: detailsData.raw_type ?? null,
    snapTradeAccountId: snaptradeAccountId,
    status: detailsData.status ?? "active",
    syncStatus: serializeJsonb(detailsData.sync_status ?? null),
    userId: appUserId,
  };
}

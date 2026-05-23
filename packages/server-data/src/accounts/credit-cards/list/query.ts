import { getBankAccountsJoined, toBankAccountListItem } from "../../_shared/bank-account-query.js";
import type { BankAccountListItem } from "../../_shared/schema.js";

/** Plaid-connected credit-type accounts. */
export async function getCreditCards(userId: string): Promise<BankAccountListItem[]> {
  const all = await getBankAccountsJoined(userId);
  return all.filter((a) => a.type === "credit").map(toBankAccountListItem);
}

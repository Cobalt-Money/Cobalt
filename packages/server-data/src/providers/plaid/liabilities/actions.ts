import { plaidClient } from "@cobalt-web/clients/plaid";
import type { AccountBase, LiabilitiesGetResponse } from "plaid";

/** Fetch liability accounts + liability details from Plaid. */
export async function fetchLiabilities(accessToken: string): Promise<{
  accounts: AccountBase[];
  liabilities: LiabilitiesGetResponse["liabilities"];
}> {
  const response = await plaidClient.liabilitiesGet({
    access_token: accessToken,
  });
  return {
    accounts: response.data.accounts,
    liabilities: response.data.liabilities,
  };
}

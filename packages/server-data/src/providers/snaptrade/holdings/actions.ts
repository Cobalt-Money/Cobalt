import { snaptradeClient } from "@cobalt-web/clients/snaptrade";
import type { AccountHoldingsAccount } from "snaptrade-typescript-sdk";

interface UserCreds {
  providerUserId: string;
  userSecret: string;
}

/** Get positions (holdings) for a SnapTrade account. */
export async function getUserHoldings(
  accountId: string,
  creds: UserCreds,
): Promise<AccountHoldingsAccount | undefined> {
  const response = await snaptradeClient.accountInformation.getUserHoldings({
    accountId,
    userId: creds.providerUserId,
    userSecret: creds.userSecret,
  });
  return response.data as AccountHoldingsAccount | undefined;
}

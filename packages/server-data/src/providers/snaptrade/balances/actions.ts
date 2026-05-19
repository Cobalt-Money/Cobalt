import { snaptradeClient } from "@cobalt-web/clients/snaptrade";
import type { Balance } from "snaptrade-typescript-sdk";

interface UserCreds {
  providerUserId: string;
  userSecret: string;
}

/** Get balances for a SnapTrade account (can span multiple currencies). */
export async function getUserAccountBalance(
  accountId: string,
  creds: UserCreds,
): Promise<Balance[] | undefined> {
  const response = await snaptradeClient.accountInformation.getUserAccountBalance({
    accountId,
    userId: creds.providerUserId,
    userSecret: creds.userSecret,
  });
  return response.data as Balance[] | undefined;
}

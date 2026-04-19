import { snaptradeClient } from "@cobalt-web/clients/snaptrade";
import type { AccountOrderRecord } from "snaptrade-typescript-sdk";

interface UserCreds {
  providerUserId: string;
  userSecret: string;
}

/** Get open + filled orders for a SnapTrade account. */
export async function getUserAccountOrders(
  accountId: string,
  creds: UserCreds
): Promise<AccountOrderRecord[] | undefined> {
  const response =
    await snaptradeClient.accountInformation.getUserAccountOrders({
      accountId,
      userId: creds.providerUserId,
      userSecret: creds.userSecret,
    });
  return response.data as AccountOrderRecord[] | undefined;
}

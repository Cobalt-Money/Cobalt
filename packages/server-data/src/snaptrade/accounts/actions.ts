import { snaptradeClient } from "@cobalt-web/clients/snaptrade";
import type { Account } from "snaptrade-typescript-sdk";

interface UserCreds {
  providerUserId: string;
  userSecret: string;
}

/** List all SnapTrade accounts for a user. */
export async function listUserAccounts(creds: UserCreds): Promise<Account[]> {
  const response = await snaptradeClient.accountInformation.listUserAccounts({
    userId: creds.providerUserId,
    userSecret: creds.userSecret,
  });
  const data = (response.data || response) as Account[];
  if (!data || !Array.isArray(data)) {
    throw new Error("Failed to get accounts from SnapTrade API");
  }
  return data;
}

/** Get details for a single SnapTrade account. */
export async function getUserAccountDetails(
  accountId: string,
  creds: UserCreds
): Promise<Account | undefined> {
  const response =
    await snaptradeClient.accountInformation.getUserAccountDetails({
      accountId,
      userId: creds.providerUserId,
      userSecret: creds.userSecret,
    });
  return response.data as Account | undefined;
}

import { snaptradeClient } from "@cobalt-web/clients/snaptrade";
import type { PaginatedUniversalActivity } from "snaptrade-typescript-sdk";

interface UserCreds {
  providerUserId: string;
  userSecret: string;
}

/** Get a page of account activities (paginated). */
export async function getAccountActivities(
  accountId: string,
  creds: UserCreds,
  opts: { startDate?: string; limit?: number; offset?: number } = {},
): Promise<PaginatedUniversalActivity | undefined> {
  const response = await snaptradeClient.accountInformation.getAccountActivities({
    accountId,
    limit: opts.limit,
    offset: opts.offset,
    startDate: opts.startDate,
    userId: creds.providerUserId,
    userSecret: creds.userSecret,
  });
  return response.data as PaginatedUniversalActivity | undefined;
}

import { db } from "@cobalt-web/db";

export interface SnapTradeUserCredentials {
  userId: string;
  providerUserId: string;
  providerUserSecret: string;
}

/** Look up SnapTrade credentials by our app's userId. */
export async function getBrokerageUserByUserId(
  userId: string
): Promise<SnapTradeUserCredentials | undefined> {
  const row = await db.query.snaptradeUser.findFirst({
    where: { userId: { eq: userId } },
  });
  if (!row) {
    return undefined;
  }
  return {
    providerUserId: row.snaptradeUserId,
    providerUserSecret: row.snaptradeUserSecret,
    userId: row.userId,
  };
}

/** Look up SnapTrade credentials by the provider's userId. */
export async function getSnapTradeUserCredentials(
  snaptradeUserIdValue: string
): Promise<{
  appUserId: string;
  providerUserId: string;
  userSecret: string;
} | null> {
  const row = await db.query.snaptradeUser.findFirst({
    where: { snaptradeUserId: { eq: snaptradeUserIdValue } },
  });
  if (!row) {
    return null;
  }
  return {
    appUserId: row.userId,
    providerUserId: row.snaptradeUserId,
    userSecret: row.snaptradeUserSecret,
  };
}

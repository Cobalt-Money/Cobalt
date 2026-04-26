import { db } from "@cobalt-web/db";
import { snaptradeAuthorization } from "@cobalt-web/db/schema/providers/snaptrade/authorization";
import { snaptradeUser } from "@cobalt-web/db/schema/providers/snaptrade/user";
import { eq } from "drizzle-orm";

/** Resolve snaptrade_authorization by authorization_id. */
export async function lookupSnaptradeAuthorization(
  authorizationId: string
): Promise<{ id: string; userId: string } | null> {
  const rows = await db
    .select({
      id: snaptradeAuthorization.id,
      userId: snaptradeAuthorization.userId,
    })
    .from(snaptradeAuthorization)
    .where(eq(snaptradeAuthorization.authorizationId, authorizationId))
    .limit(1);
  return rows[0] ?? null;
}

export interface SnapTradeUserCredentials {
  userId: string;
  providerUserId: string;
  providerUserSecret: string;
}

/** Look up SnapTrade credentials by our app's userId. */
export async function getBrokerageUserByUserId(
  userId: string
): Promise<SnapTradeUserCredentials | undefined> {
  const rows = await db
    .select()
    .from(snaptradeUser)
    .where(eq(snaptradeUser.userId, userId))
    .limit(1);
  const [row] = rows;
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
  const rows = await db
    .select()
    .from(snaptradeUser)
    .where(eq(snaptradeUser.snaptradeUserId, snaptradeUserIdValue))
    .limit(1);

  const [row] = rows;
  if (!row) {
    return null;
  }

  return {
    appUserId: row.userId,
    providerUserId: row.snaptradeUserId,
    userSecret: row.snaptradeUserSecret,
  };
}

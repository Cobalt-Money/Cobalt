import { db } from "@cobalt-web/db";
import { brokerageUser } from "@cobalt-web/db/schema/brokerage";
import type { BrokerageUser } from "@cobalt-web/db/schema/brokerage";
import { eq } from "drizzle-orm";

/** Look up a brokerage user by our app's userId. */
export async function getBrokerageUserByUserId(
  userId: string
): Promise<BrokerageUser | undefined> {
  return await db.query.brokerageUser.findFirst({
    where: { userId: { eq: userId } },
  });
}

/** Look up SnapTrade credentials by the provider's userId. */
export async function getSnapTradeUserCredentials(
  snaptradeUserId: string
): Promise<{
  appUserId: string;
  providerUserId: string;
  userSecret: string;
} | null> {
  const user = await db
    .select()
    .from(brokerageUser)
    .where(eq(brokerageUser.providerUserId, snaptradeUserId))
    .limit(1);

  if (!user[0]) {
    return null;
  }

  return {
    appUserId: user[0].userId,
    providerUserId: user[0].providerUserId,
    userSecret: user[0].providerUserSecret,
  };
}

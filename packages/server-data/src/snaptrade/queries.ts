import { db } from "@cobalt-web/db";
import type { BrokerageUser } from "@cobalt-web/db/schema/brokerage";

export async function getBrokerageUserByUserId(
  userId: string
): Promise<BrokerageUser | undefined> {
  const user = await db.query.brokerageUser.findFirst({
    where: { userId: { eq: userId } },
  });

  return user;
}

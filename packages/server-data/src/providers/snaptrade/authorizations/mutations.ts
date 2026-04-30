import { db } from "@cobalt-web/db";
import { snaptradeAuthorization } from "@cobalt-web/db/schema/providers/snaptrade/authorization";
import { eq } from "drizzle-orm";

export async function upsertSnaptradeAuthorization(
  brokerageAuthorizationId: string,
  appUserId: string,
  brokerageSlug: string,
  brokerage: string,
  name: string,
  type = "read"
): Promise<string> {
  const existing = await db.query.snaptradeAuthorization.findFirst({
    columns: { id: true },
    where: { authorizationId: { eq: brokerageAuthorizationId } },
  });

  if (existing) {
    await db
      .update(snaptradeAuthorization)
      .set({
        brokerage,
        brokerageSlug,
        disabledAt: null,
        isDisabled: false,
        name,
        type,
        userId: appUserId,
      })
      .where(
        eq(snaptradeAuthorization.authorizationId, brokerageAuthorizationId)
      );

    return existing.id;
  }

  const [inserted] = await db
    .insert(snaptradeAuthorization)
    .values({
      authorizationId: brokerageAuthorizationId,
      brokerage,
      brokerageSlug,
      isDisabled: false,
      isEligibleForPayout: false,
      name,
      type,
      userId: appUserId,
    })
    .returning({ id: snaptradeAuthorization.id });

  return inserted?.id ?? "";
}

export async function updateSnaptradeAuthorizationStatus(
  brokerageAuthorizationId: string,
  isDisabled: boolean
): Promise<void> {
  await db
    .update(snaptradeAuthorization)
    .set({
      disabledAt: isDisabled ? new Date() : null,
      isDisabled,
    })
    .where(
      eq(snaptradeAuthorization.authorizationId, brokerageAuthorizationId)
    );
}

export async function deleteSnaptradeAuthorization(
  brokerageAuthorizationId: string
): Promise<void> {
  await db
    .delete(snaptradeAuthorization)
    .where(
      eq(snaptradeAuthorization.authorizationId, brokerageAuthorizationId)
    );
}

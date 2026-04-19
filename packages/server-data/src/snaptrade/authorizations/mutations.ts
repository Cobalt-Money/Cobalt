import { db } from "@cobalt-web/db";
import { brokerageAuthorizations } from "@cobalt-web/db/schema/brokerage";
import { eq } from "drizzle-orm";

export async function upsertSnaptradeAuthorization(
  brokerageAuthorizationId: string,
  appUserId: string,
  brokerageSlug: string,
  brokerage: string,
  name: string,
  type = "read"
): Promise<string> {
  const existing = await db
    .select({ id: brokerageAuthorizations.id })
    .from(brokerageAuthorizations)
    .where(
      eq(brokerageAuthorizations.authorizationId, brokerageAuthorizationId)
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(brokerageAuthorizations)
      .set({
        brokerage,
        brokerageSlug,
        disabledAt: null,
        isDisabled: 0,
        name,
        type,
        userId: appUserId,
      })
      .where(
        eq(brokerageAuthorizations.authorizationId, brokerageAuthorizationId)
      );

    return existing.at(0)?.id ?? "";
  }

  const [inserted] = await db
    .insert(brokerageAuthorizations)
    .values({
      authorizationId: brokerageAuthorizationId,
      brokerage,
      brokerageSlug,
      isDisabled: 0,
      isEligibleForPayout: 0,
      name,
      type,
      userId: appUserId,
    })
    .returning({ id: brokerageAuthorizations.id });

  return inserted?.id ?? "";
}

export async function updateSnaptradeAuthorizationStatus(
  brokerageAuthorizationId: string,
  isDisabled: boolean
): Promise<void> {
  await db
    .update(brokerageAuthorizations)
    .set({
      disabledAt: isDisabled ? new Date() : null,
      isDisabled: isDisabled ? 1 : 0,
    })
    .where(
      eq(brokerageAuthorizations.authorizationId, brokerageAuthorizationId)
    );
}

export async function deleteSnaptradeAuthorization(
  brokerageAuthorizationId: string
): Promise<void> {
  await db
    .delete(brokerageAuthorizations)
    .where(
      eq(brokerageAuthorizations.authorizationId, brokerageAuthorizationId)
    );
}

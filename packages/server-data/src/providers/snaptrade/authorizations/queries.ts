import { db } from "@cobalt-web/db";

export async function getSnaptradeAuthorizationReconciliationTargets(appUserId: string) {
  const [providerUser, authorizations] = await Promise.all([
    db.query.snaptradeUser.findFirst({
      columns: { snaptradeUserId: true },
      where: { userId: { eq: appUserId } },
    }),
    db.query.snaptradeAuthorization.findMany({
      columns: { authorizationId: true },
      where: { userId: { eq: appUserId } },
    }),
  ]);

  if (!providerUser) {
    return [];
  }

  return authorizations.map(({ authorizationId }) => ({
    authorizationId,
    providerUserId: providerUser.snaptradeUserId,
  }));
}

import { db } from "@cobalt-web/db";
import { snaptradeAuthorization } from "@cobalt-web/db/schema/providers/snaptrade/authorization";
import { eq } from "drizzle-orm";

import { ApiError } from "../../_shared/api-error.js";
import { removeBrokerageAuthorization } from "./authorizations/actions.js";

export async function disconnectSnaptradeAuthorizationByUserId(
  userId: string,
  snapTradeAuthorizationId: string,
  databaseAuthId: string,
): Promise<{
  deletedAccounts?: {
    accountId: string;
    institutionName: string | null;
  }[];
  error?: string;
  message: string;
  success: boolean;
}> {
  try {
    const stUser = await db.query.snaptradeUser.findFirst({
      where: { userId: { eq: userId } },
    });

    if (!stUser) {
      return {
        message: "User not found in SnapTrade system",
        success: false,
      };
    }

    try {
      await removeBrokerageAuthorization(snapTradeAuthorizationId, {
        providerUserId: stUser.snaptradeUserId,
        providerUserSecret: stUser.snaptradeUserSecret,
      });
    } catch {
      // Continue with DB cleanup if SnapTrade already removed the link
    }

    // Snapshot of accounts before cascade so we can report what was deleted.
    const associatedAccounts = await db.query.financialAccount.findMany({
      columns: { externalId: true, institutionName: true },
      where: { snaptradeAuthorizationId: { eq: databaseAuthId } },
    });

    // Deleting the authorization cascades to financial_account, which cascades
    // to balance / holding / snapshot / orders / investment_activity / etc.
    await db.delete(snaptradeAuthorization).where(eq(snaptradeAuthorization.id, databaseAuthId));

    return {
      deletedAccounts: associatedAccounts.map((a) => ({
        accountId: a.externalId ?? "",
        institutionName: a.institutionName,
      })),
      message: `Successfully disconnected brokerage connection${associatedAccounts.length > 1 ? "s" : ""}. All associated data including portfolio history has been removed.`,
      success: true,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to disconnect brokerage connection. Please try again.",
      success: false,
    };
  }
}

export async function disconnectBrokerageAccountByUserId(
  userId: string,
  accountId: string,
): Promise<{ message: string; success: boolean }> {
  // Inline userId filter — neutral 404 for missing OR unowned.
  const account = await db.query.financialAccount.findFirst({
    columns: {
      id: true,
      institutionName: true,
      snaptradeAuthorizationId: true,
      userId: true,
    },
    where: { id: { eq: accountId }, userId: { eq: userId } },
  });

  if (!account) {
    throw new ApiError(404, "brokerage_account_not_found", "Brokerage account not found");
  }

  if (!account.snaptradeAuthorizationId) {
    throw new ApiError(
      409,
      "brokerage_account_not_snaptrade",
      "Account is not a SnapTrade-connected brokerage account",
    );
  }

  const auth = await db.query.snaptradeAuthorization.findFirst({
    columns: { authorizationId: true, id: true },
    where: { id: { eq: account.snaptradeAuthorizationId } },
  });

  if (!auth) {
    throw new ApiError(
      409,
      "brokerage_authorization_missing",
      "SnapTrade authorization is missing",
    );
  }

  const result = await disconnectSnaptradeAuthorizationByUserId(
    userId,
    auth.authorizationId,
    auth.id,
  );

  if (!result.success) {
    throw new ApiError(
      502,
      "snaptrade_upstream_failed",
      result.message || "Failed to disconnect brokerage with upstream provider",
    );
  }

  return {
    message: `Successfully disconnected ${account.institutionName || "brokerage account"}`,
    success: true,
  };
}

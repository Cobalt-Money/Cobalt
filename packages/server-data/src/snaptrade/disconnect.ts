import { snaptradeClient } from "@cobalt-web/clients/snaptrade";
import { db } from "@cobalt-web/db";
import {
  brokerageAccounts,
  brokerageAuthorizations,
  portfolioSnapshots,
} from "@cobalt-web/db/schema/brokerage";
import { and, eq, inArray } from "drizzle-orm";

export async function disconnectSnaptradeAuthorizationByUserId(
  userId: string,
  snapTradeAuthorizationId: string,
  databaseAuthId: string
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
    const snaptradeUser = await db.query.brokerageUser.findFirst({
      where: { userId: { eq: userId } },
    });

    if (!snaptradeUser) {
      return {
        message: "User not found in SnapTrade system",
        success: false,
      };
    }

    const { providerUserId, providerUserSecret } = snaptradeUser;

    try {
      await snaptradeClient.connections.removeBrokerageAuthorization({
        authorizationId: snapTradeAuthorizationId,
        userId: providerUserId,
        userSecret: providerUserSecret,
      });
    } catch {
      // Continue with DB cleanup if SnapTrade already removed the link
    }

    const associatedAccounts = await db.query.brokerageAccounts.findMany({
      columns: {
        accountId: true,
        id: true,
        institutionName: true,
      },
      where: { brokerageAuthId: { eq: databaseAuthId } },
    });

    const databaseAccountIds = associatedAccounts.map((a) => a.id);

    if (databaseAccountIds.length > 0) {
      await db
        .delete(portfolioSnapshots)
        .where(
          and(
            eq(portfolioSnapshots.userId, userId),
            inArray(portfolioSnapshots.accountId, databaseAccountIds)
          )
        );
    }

    const deletedAccounts = await db
      .delete(brokerageAccounts)
      .where(eq(brokerageAccounts.brokerageAuthId, databaseAuthId))
      .returning({
        accountId: brokerageAccounts.accountId,
        institutionName: brokerageAccounts.institutionName,
      });

    await db
      .delete(brokerageAuthorizations)
      .where(eq(brokerageAuthorizations.id, databaseAuthId));

    return {
      deletedAccounts: deletedAccounts.map((a) => ({
        accountId: a.accountId,
        institutionName: a.institutionName,
      })),
      message: `Successfully disconnected brokerage connection${deletedAccounts.length > 1 ? "s" : ""}. All associated data including portfolio history has been removed.`,
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

/**
 * Delete a brokerage authorization record by its SnapTrade authorization ID.
 * Used by webhook handlers when a connection is deleted upstream.
 */
export async function deleteSnaptradeAuthorization(
  authorizationId: string
): Promise<{ success: boolean; authorizationId: string }> {
  await db
    .delete(brokerageAuthorizations)
    .where(eq(brokerageAuthorizations.authorizationId, authorizationId));

  return { authorizationId, success: true };
}

export async function disconnectBrokerageAccountByUserId(
  userId: string,
  accountId: string
): Promise<{ message: string; success: boolean }> {
  try {
    const account = await db.query.brokerageAccounts.findFirst({
      where: { id: { eq: accountId } },
      with: {
        brokerageAuthorization: true,
      },
    });

    if (account === undefined) {
      return { message: "Account not found", success: false };
    }

    if (account.userId !== userId) {
      return { message: "Unauthorized", success: false };
    }

    const auth = account.brokerageAuthorization;
    if (!auth) {
      return { message: "Invalid account data", success: false };
    }

    const snapTradeAuthorizationId = auth.authorizationId;
    const databaseAuthId = auth.id;
    if (!snapTradeAuthorizationId || !databaseAuthId) {
      return { message: "Invalid account data", success: false };
    }

    const result = await disconnectSnaptradeAuthorizationByUserId(
      userId,
      snapTradeAuthorizationId,
      databaseAuthId
    );

    if (result.success) {
      return {
        message: `Successfully disconnected ${account.institutionName || "brokerage account"}`,
        success: true,
      };
    }

    return { message: result.message, success: false };
  } catch {
    return {
      message: "Failed to disconnect account. Please try again.",
      success: false,
    };
  }
}

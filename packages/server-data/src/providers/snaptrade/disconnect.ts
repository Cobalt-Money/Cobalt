import { db } from "@cobalt-web/db";
import { snaptradeAuthorization } from "@cobalt-web/db/schema/providers/snaptrade/authorization";
import { eq } from "drizzle-orm";

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
  try {
    const account = await db.query.financialAccount.findFirst({
      columns: {
        id: true,
        institutionName: true,
        snaptradeAuthorizationId: true,
        userId: true,
      },
      where: { id: { eq: accountId } },
    });

    if (!account) {
      return { message: "Account not found", success: false };
    }

    if (account.userId !== userId) {
      return { message: "Unauthorized", success: false };
    }

    if (!account.snaptradeAuthorizationId) {
      return { message: "Invalid account data", success: false };
    }

    const auth = await db.query.snaptradeAuthorization.findFirst({
      columns: { authorizationId: true, id: true },
      where: { id: { eq: account.snaptradeAuthorizationId } },
    });

    if (!auth) {
      return { message: "Invalid account data", success: false };
    }

    const result = await disconnectSnaptradeAuthorizationByUserId(
      userId,
      auth.authorizationId,
      auth.id,
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

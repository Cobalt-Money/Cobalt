import { snaptradeClient } from "@cobalt-web/clients/snaptrade";
import { db } from "@cobalt-web/db";
import { brokerageAuthorizations } from "@cobalt-web/db/schema/brokerage";
import { toDateOnlyString } from "@cobalt-web/server-data/lib/date";
import { deleteSnaptradeAuthorization } from "@cobalt-web/server-data/snaptrade/disconnect";
import {
  getSnapTradeUserCredentials,
  upsertSnaptradeAuthorizationFromWebhook,
  updateSnaptradeAuthorizationStatusFromWebhook,
  upsertBrokerageAccountFromWebhook,
  upsertAccountDetailsFromWebhook,
  upsertAccountBalancesFromWebhook,
  upsertAccountPositionsFromWebhook,
  upsertAccountOrdersFromWebhook,
  upsertAccountActivitiesFromWebhook,
  getLastActivitySyncDateFromWebhook,
} from "@cobalt-web/server-data/snaptrade/webhook-upserts";
import { eq } from "drizzle-orm";
import type {
  Account,
  AccountHoldingsAccount,
  Balance,
  AccountOrderRecord,
  UniversalActivity,
  PaginatedUniversalActivity,
} from "snaptrade-typescript-sdk";
import { RetryableError, FatalError } from "workflow";

// ============================================================================
// TYPES
// ============================================================================

/**
 * User credentials returned from database lookup
 * Derived from getSnapTradeUserCredentials return type (non-null)
 */
export type UserCredentials = NonNullable<
  Awaited<ReturnType<typeof getSnapTradeUserCredentials>>
>;

/**
 * Holdings update webhook details payload
 */
export interface HoldingsDetails {
  balances?: { success: boolean };
  orders?: { success: boolean };
  positions?: { success: boolean };
  total_value?: { success: boolean };
}

/**
 * SnapTrade API error response shape
 * Minimal interface for error handling
 */
interface SnapTradeApiError {
  response?: {
    status?: number;
  };
}

// ============================================================================
// COMMON STEPS (Reusable across event types)
// ============================================================================

/**
 * Step: Get SnapTrade user credentials from database
 */

export async function getSnapTradeUserCredentialsStep(
  providerUserId: string
): Promise<UserCredentials> {
  "use step";

  const userCredentials = await getSnapTradeUserCredentials(providerUserId);

  if (!userCredentials) {
    throw new FatalError(
      `SnapTrade user not found in database: ${providerUserId}`
    );
  }

  return userCredentials;
}

/**
 * Step: Fetch accounts from SnapTrade API
 */
export async function fetchAccountsStep(
  userCredentials: UserCredentials
): Promise<Account[]> {
  "use step";

  try {
    const accountsResponse =
      await snaptradeClient.accountInformation.listUserAccounts({
        userId: userCredentials.providerUserId,
        userSecret: userCredentials.userSecret,
      });

    const accountsData = (accountsResponse.data ||
      accountsResponse) as Account[];

    if (!accountsData || !Array.isArray(accountsData)) {
      throw new Error("Failed to get accounts from SnapTrade API");
    }

    return accountsData;
  } catch (error: unknown) {
    const err = error as SnapTradeApiError;
    if (err.response?.status === 429) {
      throw new RetryableError("SnapTrade rate limited", { retryAfter: "1m" });
    }
    throw error;
  }
}

// ============================================================================
// CONNECTION EVENT STEPS
// ============================================================================

/**
 * Step: Upsert brokerage authorization
 */
export async function upsertSnaptradeAuthorizationStep(
  brokerageAuthorizationId: string,
  appUserId: string,
  brokerageId: string
): Promise<string> {
  "use step";

  const authDbId = await upsertSnaptradeAuthorizationFromWebhook(
    brokerageAuthorizationId,
    appUserId,
    brokerageId,
    brokerageId,
    `Connection ${brokerageAuthorizationId}`
  );

  return authDbId;
}

/**
 * Step: Update authorization status (broken/fixed)
 */
export async function updateAuthorizationStatusStep(
  brokerageAuthorizationId: string,
  isDisabled: boolean
): Promise<void> {
  "use step";

  await updateSnaptradeAuthorizationStatusFromWebhook(
    brokerageAuthorizationId,
    isDisabled
  );
}

/**
 * Step: Get brokerage authorization display name for alerts.
 */
export async function getAuthorizationDisplayNameStep(
  brokerageAuthorizationId: string
): Promise<string> {
  "use step";

  const [auth] = await db
    .select({
      brokerage: brokerageAuthorizations.brokerage,
      name: brokerageAuthorizations.name,
    })
    .from(brokerageAuthorizations)
    .where(
      eq(brokerageAuthorizations.authorizationId, brokerageAuthorizationId)
    )
    .limit(1);

  return auth?.brokerage ?? auth?.name ?? "Brokerage";
}

/**
 * Step: Delete brokerage authorization
 */
export async function deleteSnaptradeAuthorizationStep(
  brokerageAuthorizationId: string
): Promise<void> {
  "use step";

  await deleteSnaptradeAuthorization(brokerageAuthorizationId);
}

/**
 * Step: Upsert accounts (processes accounts in parallel)
 */
export async function upsertAccountsStep(
  accounts: Account[],
  authDbId: string,
  appUserId: string
): Promise<{ upsertedCount: number; failedCount: number }> {
  "use step";

  // Process accounts in parallel
  const results = await Promise.allSettled(
    accounts.map((accountData) =>
      upsertBrokerageAccountFromWebhook(
        accountData.id,
        authDbId,
        appUserId,
        accountData
      )
    )
  );

  let upsertedCount = 0;
  let failedCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      upsertedCount += 1;
    } else {
      failedCount += 1;
    }
  }

  return { failedCount, upsertedCount };
}

// ============================================================================
// HOLDINGS UPDATE STEPS
// ============================================================================

/**
 * Step: Fetch account details from SnapTrade API (does NOT upsert to DB)
 * This step only fetches data - the account must be created separately first
 * before upserting details to snaptrade_account_detail table
 */
export async function syncAccountDetailsStep(
  accountId: string,
  userCredentials: UserCredentials
): Promise<{ success: boolean; data?: Account }> {
  "use step";

  try {
    const detailsResponse =
      await snaptradeClient.accountInformation.getUserAccountDetails({
        accountId,
        userId: userCredentials.providerUserId,
        userSecret: userCredentials.userSecret,
      });

    const data = detailsResponse.data as Account | undefined;

    if (data) {
      return { data, success: true };
    }

    return { success: false };
  } catch (error: unknown) {
    const err = error as SnapTradeApiError;
    if (err.response?.status === 429) {
      throw new RetryableError("SnapTrade rate limited", { retryAfter: "1m" });
    }

    return { success: false };
  }
}

/**
 * Step: Upsert account details to snaptrade_account_detail table
 * This should be called AFTER the account exists in snaptrade_account
 */
export async function upsertAccountDetailsStep(
  accountId: string,
  userCredentials: UserCredentials,
  accountData: Account
): Promise<{ success: boolean }> {
  "use step";

  try {
    await upsertAccountDetailsFromWebhook(
      accountId,
      userCredentials.appUserId,
      accountData
    );

    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Step: Update main snaptrade_account record
 * This ensures the main account record stays in sync even when only ACCOUNT_HOLDINGS_UPDATED webhooks fire
 */
export async function syncBrokerageAccountStep(
  accountId: string,
  authDbId: string,
  userCredentials: UserCredentials,
  accountData: Account
): Promise<{ success: boolean }> {
  "use step";

  try {
    await upsertBrokerageAccountFromWebhook(
      accountId,
      authDbId,
      userCredentials.appUserId,
      accountData
    );

    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Step: Sync account balances (cash, buying power)
 */
export async function syncAccountBalancesStep(
  accountId: string,
  userCredentials: UserCredentials
): Promise<{ success: boolean; data?: Balance[] }> {
  "use step";

  try {
    const balancesResponse =
      await snaptradeClient.accountInformation.getUserAccountBalance({
        accountId,
        userId: userCredentials.providerUserId,
        userSecret: userCredentials.userSecret,
      });

    const data = balancesResponse.data as Balance[] | undefined;

    if (data && Array.isArray(data)) {
      await upsertAccountBalancesFromWebhook(
        accountId,
        userCredentials.appUserId,
        data
      );

      return { data, success: true };
    }

    return { success: false };
  } catch (error: unknown) {
    const err = error as SnapTradeApiError;
    if (err.response?.status === 429) {
      throw new RetryableError("SnapTrade rate limited", { retryAfter: "1m" });
    }

    return { success: false };
  }
}

/**
 * Step: Sync account positions (holdings)
 */
export async function syncAccountPositionsStep(
  accountId: string,
  userCredentials: UserCredentials
): Promise<{ success: boolean; positionCount?: number }> {
  "use step";

  try {
    const holdingsResponse =
      await snaptradeClient.accountInformation.getUserHoldings({
        accountId,
        userId: userCredentials.providerUserId,
        userSecret: userCredentials.userSecret,
      });

    const data = holdingsResponse.data as AccountHoldingsAccount | undefined;

    if (data?.positions && Array.isArray(data.positions)) {
      await upsertAccountPositionsFromWebhook(
        accountId,
        userCredentials.appUserId,
        data.positions
      );

      return { positionCount: data.positions.length, success: true };
    }

    return { success: false };
  } catch (error: unknown) {
    const err = error as SnapTradeApiError;
    if (err.response?.status === 429) {
      throw new RetryableError("SnapTrade rate limited", { retryAfter: "1m" });
    }

    return { success: false };
  }
}

/**
 * Step: Sync account orders (pending orders)
 */
export async function syncAccountOrdersStep(
  accountId: string,
  userCredentials: UserCredentials
): Promise<{ success: boolean; orderCount?: number }> {
  "use step";

  try {
    const ordersResponse =
      await snaptradeClient.accountInformation.getUserAccountOrders({
        accountId,
        userId: userCredentials.providerUserId,
        userSecret: userCredentials.userSecret,
      });

    const data = ordersResponse.data as AccountOrderRecord[] | undefined;

    if (data && Array.isArray(data)) {
      await upsertAccountOrdersFromWebhook(
        accountId,
        userCredentials.appUserId,
        data
      );

      return { orderCount: data.length, success: true };
    }

    return { success: false };
  } catch (error: unknown) {
    const err = error as SnapTradeApiError;
    if (err.response?.status === 429) {
      throw new RetryableError("SnapTrade rate limited", { retryAfter: "1m" });
    }

    return { success: false };
  }
}

/**
 * Step: Sync recent activities (last 7 days)
 */
export async function syncRecentActivitiesStep(
  accountId: string,
  userCredentials: UserCredentials
): Promise<{ success: boolean; activityCount?: number }> {
  "use step";

  try {
    // Get activities from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = toDateOnlyString(sevenDaysAgo);

    const activitiesResponse =
      await snaptradeClient.accountInformation.getAccountActivities({
        accountId,
        startDate,
        userId: userCredentials.providerUserId,
        userSecret: userCredentials.userSecret,
      });

    const response = activitiesResponse.data as
      | PaginatedUniversalActivity
      | undefined;

    if (response?.data && Array.isArray(response.data)) {
      await upsertAccountActivitiesFromWebhook(
        accountId,
        userCredentials.appUserId,
        response.data
      );

      return { activityCount: response.data.length, success: true };
    }

    return { success: false };
  } catch (error: unknown) {
    const err = error as SnapTradeApiError;
    if (err.response?.status === 429) {
      throw new RetryableError("SnapTrade rate limited", { retryAfter: "1m" });
    }

    return { success: false };
  }
}

// ============================================================================
// TRANSACTION STEPS
// ============================================================================

/**
 * Step: Fetch ALL activities with pagination (initial sync)
 */
export async function fetchAllActivitiesStep(
  accountId: string,
  userCredentials: UserCredentials
): Promise<{ activities: UniversalActivity[]; activityCount: number }> {
  "use step";

  const allActivities: UniversalActivity[] = [];
  let offset = 0;
  let hasMorePages = true;
  const limit = 1000;

  try {
    while (hasMorePages) {
      const activitiesResponse =
        await snaptradeClient.accountInformation.getAccountActivities({
          accountId,
          limit,
          offset,
          userId: userCredentials.providerUserId,
          userSecret: userCredentials.userSecret,
        });

      const response = activitiesResponse.data as
        | PaginatedUniversalActivity
        | undefined;
      const pageActivities = response?.data || [];

      if (!Array.isArray(pageActivities)) {
        throw new TypeError(
          `Failed to get activities from SnapTrade API at offset ${offset}`
        );
      }

      allActivities.push(...pageActivities);

      // Check if we got fewer results than limit (indicating last page)
      hasMorePages = pageActivities.length === limit;
      offset += limit;

      // Safety check to prevent infinite loops (max 100,000 transactions)
      if (offset > 100_000) {
        break;
      }
    }

    return { activities: allActivities, activityCount: allActivities.length };
  } catch (error: unknown) {
    const err = error as SnapTradeApiError;
    if (err.response?.status === 429) {
      throw new RetryableError("SnapTrade rate limited", { retryAfter: "1m" });
    }
    throw error;
  }
}

/**
 * Step: Fetch incremental activities (since last sync)
 */
export async function fetchIncrementalActivitiesStep(
  accountId: string,
  userCredentials: UserCredentials
): Promise<{
  activities: UniversalActivity[];
  activityCount: number;
  lastSyncDate: string | null;
}> {
  "use step";

  try {
    // Get the last sync date
    const lastSyncDate = await getLastActivitySyncDateFromWebhook(accountId);

    if (lastSyncDate) {
      const startDate = toDateOnlyString(lastSyncDate);

      const activitiesResponse =
        await snaptradeClient.accountInformation.getAccountActivities({
          accountId,
          startDate,
          userId: userCredentials.providerUserId,
          userSecret: userCredentials.userSecret,
        });

      const response = activitiesResponse.data as
        | PaginatedUniversalActivity
        | undefined;
      const activitiesData = response?.data || [];

      return {
        activities: activitiesData,
        activityCount: activitiesData.length,
        lastSyncDate: startDate,
      };
    }
    // No previous sync, need to fetch all (will be handled by workflow)

    return {
      activities: [],
      activityCount: 0,
      lastSyncDate: null,
    };
  } catch (error: unknown) {
    const err = error as SnapTradeApiError;
    if (err.response?.status === 429) {
      throw new RetryableError("SnapTrade rate limited", { retryAfter: "1m" });
    }
    throw error;
  }
}

/**
 * Step: Upsert activities to database
 */
export async function upsertActivitiesStep(
  accountId: string,
  appUserId: string,
  activities: UniversalActivity[]
): Promise<{ upsertedCount: number }> {
  "use step";

  if (activities.length === 0) {
    return { upsertedCount: 0 };
  }

  await upsertAccountActivitiesFromWebhook(accountId, appUserId, activities);

  return { upsertedCount: activities.length };
}

/**
 * Step: Refresh account details and balances (used after transaction sync)
 */
export async function refreshAccountDataStep(
  accountId: string,
  userCredentials: UserCredentials
): Promise<{ detailsSuccess: boolean; balancesSuccess: boolean }> {
  "use step";

  // Fetch details and balances in parallel
  const [detailsResult, balancesResult] = await Promise.allSettled([
    (async () => {
      const detailsResponse =
        await snaptradeClient.accountInformation.getUserAccountDetails({
          accountId,
          userId: userCredentials.providerUserId,
          userSecret: userCredentials.userSecret,
        });

      const data = detailsResponse.data as Account | undefined;

      if (data) {
        await upsertAccountDetailsFromWebhook(
          accountId,
          userCredentials.appUserId,
          data
        );
        return true;
      }
      return false;
    })(),
    (async () => {
      const balancesResponse =
        await snaptradeClient.accountInformation.getUserAccountBalance({
          accountId,
          userId: userCredentials.providerUserId,
          userSecret: userCredentials.userSecret,
        });

      const data = balancesResponse.data as Balance[] | undefined;

      if (data && Array.isArray(data)) {
        await upsertAccountBalancesFromWebhook(
          accountId,
          userCredentials.appUserId,
          data
        );
        return true;
      }
      return false;
    })(),
  ]);

  const detailsSuccess =
    detailsResult.status === "fulfilled" && detailsResult.value;
  const balancesSuccess =
    balancesResult.status === "fulfilled" && balancesResult.value;

  return { balancesSuccess, detailsSuccess };
}

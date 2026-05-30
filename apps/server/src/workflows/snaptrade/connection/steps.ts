import {
  getUserAccountDetails,
  listUserAccounts,
} from "@cobalt-web/server-data/providers/snaptrade/accounts/actions";
import {
  upsertAccountDetails,
  upsertBrokerageAccount,
} from "@cobalt-web/server-data/providers/snaptrade/accounts/mutations";
import { getAccountActivities } from "@cobalt-web/server-data/providers/snaptrade/activities/actions";
import { upsertAccountActivities } from "@cobalt-web/server-data/providers/snaptrade/activities/mutations";
import { getLastActivitySyncDate } from "@cobalt-web/server-data/providers/snaptrade/activities/queries";
import { getSnapTradeUserCredentials } from "@cobalt-web/server-data/providers/snaptrade/auth/queries";
import {
  deleteSnaptradeAuthorization,
  getSnaptradeAuthorizationDbId,
  updateSnaptradeAuthorizationStatus,
  upsertSnaptradeAuthorization,
} from "@cobalt-web/server-data/providers/snaptrade/authorizations/mutations";
import { getUserAccountBalance } from "@cobalt-web/server-data/providers/snaptrade/balances/actions";
import { upsertAccountBalances } from "@cobalt-web/server-data/providers/snaptrade/balances/mutations";
import { getUserHoldings } from "@cobalt-web/server-data/providers/snaptrade/holdings/actions";
import { upsertAccountPositions } from "@cobalt-web/server-data/providers/snaptrade/holdings/mutations";
import { getUserAccountOrders } from "@cobalt-web/server-data/providers/snaptrade/orders/actions";
import { upsertAccountOrders } from "@cobalt-web/server-data/providers/snaptrade/orders/mutations";
import { upsertAllBalanceSnapshots } from "@cobalt-web/server-data/snapshots/mutations";
import type { Account, Balance, UniversalActivity } from "snaptrade-typescript-sdk";
import { FatalError, RetryableError } from "workflow";

// ============================================================================
// TYPES
// ============================================================================

export type UserCredentials = NonNullable<Awaited<ReturnType<typeof getSnapTradeUserCredentials>>>;

export interface HoldingsDetails {
  total_value?: { success: boolean };
  balances?: { success: boolean };
  positions?: { success: boolean };
  orders?: { success: boolean };
}

export interface SnapTradeWorkflowResult {
  success: boolean;
  eventType: string;
  userId: string;
  error?: string;
}

export interface ConnectionAddedParams {
  userId: string;
  brokerageAuthorizationId: string;
  brokerageId: string;
}

export interface ConnectionUpdatedParams {
  userId: string;
  brokerageAuthorizationId: string;
}

export interface ConnectionBrokenParams {
  userId: string;
  brokerageAuthorizationId: string;
}

export interface ConnectionDeletedParams {
  userId: string;
  brokerageAuthorizationId: string;
}

export interface HoldingsUpdatedParams {
  userId: string;
  accountId: string;
  brokerageAuthorizationId: string;
  details?: HoldingsDetails;
}

export interface TransactionsParams {
  userId: string;
  accountId: string;
  brokerageAuthorizationId: string;
}

interface SnapTradeApiError {
  response?: { status?: number };
}

function toDateOnlyString(date: Date): string {
  return date.toISOString().split("T").at(0) ?? "";
}

// ============================================================================
// COMMON STEPS
// ============================================================================

export async function getSnapTradeUserCredentialsStep(
  providerUserId: string,
): Promise<UserCredentials> {
  "use step";

  const userCredentials = await getSnapTradeUserCredentials(providerUserId);

  if (!userCredentials) {
    throw new FatalError(`SnapTrade user not found in database: ${providerUserId}`);
  }

  return userCredentials;
}

export async function fetchAccountsStep(userCredentials: UserCredentials): Promise<Account[]> {
  "use step";

  try {
    return await listUserAccounts(userCredentials);
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

export async function upsertSnaptradeAuthorizationStep(
  brokerageAuthorizationId: string,
  appUserId: string,
  brokerageId: string,
): Promise<string> {
  "use step";

  const authDbId = await upsertSnaptradeAuthorization(
    brokerageAuthorizationId,
    appUserId,
    brokerageId,
    brokerageId,
    `Connection ${brokerageAuthorizationId}`,
  );

  return authDbId;
}

/**
 * Read-only lookup of the internal auth DB id. Used by workflows (holdings
 * sync) that need the FK to attach accounts but must not overwrite the
 * brokerage/name fields set at connection time.
 */
export async function getSnaptradeAuthorizationDbIdStep(
  brokerageAuthorizationId: string,
): Promise<string> {
  "use step";

  const dbId = await getSnaptradeAuthorizationDbId(brokerageAuthorizationId);
  if (!dbId) {
    throw new FatalError(
      `snaptrade_authorization row missing for authorizationId=${brokerageAuthorizationId}`,
    );
  }
  return dbId;
}

export async function updateAuthorizationStatusStep(
  brokerageAuthorizationId: string,
  isDisabled: boolean,
): Promise<void> {
  "use step";

  await updateSnaptradeAuthorizationStatus(brokerageAuthorizationId, isDisabled);
}

export async function deleteSnaptradeAuthorizationStep(
  brokerageAuthorizationId: string,
): Promise<void> {
  "use step";

  await deleteSnaptradeAuthorization(brokerageAuthorizationId);
}

export async function upsertAccountsStep(
  accounts: Account[],
  authDbId: string,
  appUserId: string,
): Promise<{ upsertedCount: number; failedCount: number }> {
  "use step";

  const results = await Promise.allSettled(
    accounts.map((accountData) =>
      upsertBrokerageAccount(accountData.id, authDbId, appUserId, accountData),
    ),
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

export async function syncAccountDetailsStep(
  accountId: string,
  userCredentials: UserCredentials,
): Promise<{ success: boolean; data?: Account }> {
  "use step";

  try {
    const data = await getUserAccountDetails(accountId, userCredentials);
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

export async function upsertAccountDetailsStep(
  accountId: string,
  userCredentials: UserCredentials,
  accountData: Account,
): Promise<{ success: boolean }> {
  "use step";

  try {
    await upsertAccountDetails(accountId, userCredentials.appUserId, accountData);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function syncBrokerageAccountStep(
  accountId: string,
  authDbId: string,
  userCredentials: UserCredentials,
  accountData: Account,
): Promise<{ success: boolean }> {
  "use step";

  try {
    await upsertBrokerageAccount(accountId, authDbId, userCredentials.appUserId, accountData);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function syncAccountBalancesStep(
  accountId: string,
  userCredentials: UserCredentials,
  accountDetails?: Account,
): Promise<{ success: boolean; data?: Balance[] }> {
  "use step";

  try {
    const data = await getUserAccountBalance(accountId, userCredentials);
    if (data && Array.isArray(data)) {
      await upsertAccountBalances(accountId, userCredentials.appUserId, data, accountDetails);
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

export async function syncAccountPositionsStep(
  accountId: string,
  userCredentials: UserCredentials,
): Promise<{ success: boolean; positionCount?: number }> {
  "use step";

  try {
    const data = await getUserHoldings(accountId, userCredentials);
    if (data?.positions && Array.isArray(data.positions)) {
      await upsertAccountPositions(accountId, userCredentials.appUserId, data.positions);
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

export async function syncAccountOrdersStep(
  accountId: string,
  userCredentials: UserCredentials,
): Promise<{ success: boolean; orderCount?: number }> {
  "use step";

  try {
    const data = await getUserAccountOrders(accountId, userCredentials);
    if (data && Array.isArray(data)) {
      await upsertAccountOrders(accountId, userCredentials.appUserId, data);
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

export async function syncRecentActivitiesStep(
  accountId: string,
  userCredentials: UserCredentials,
): Promise<{ success: boolean; activityCount?: number }> {
  "use step";

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = toDateOnlyString(sevenDaysAgo);

    const response = await getAccountActivities(accountId, userCredentials, {
      startDate,
    });

    if (response?.data && Array.isArray(response.data)) {
      await upsertAccountActivities(accountId, userCredentials.appUserId, response.data);
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

export async function fetchAllActivitiesStep(
  accountId: string,
  userCredentials: UserCredentials,
): Promise<{ activities: UniversalActivity[]; activityCount: number }> {
  "use step";

  const allActivities: UniversalActivity[] = [];
  let offset = 0;
  let hasMorePages = true;
  const limit = 1000;

  try {
    while (hasMorePages) {
      const response = await getAccountActivities(accountId, userCredentials, {
        limit,
        offset,
      });
      const pageActivities = response?.data || [];

      if (!Array.isArray(pageActivities)) {
        throw new TypeError(`Failed to get activities from SnapTrade API at offset ${offset}`);
      }

      allActivities.push(...pageActivities);
      hasMorePages = pageActivities.length === limit;
      offset += limit;

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

export async function fetchIncrementalActivitiesStep(
  accountId: string,
  userCredentials: UserCredentials,
): Promise<{
  activities: UniversalActivity[];
  activityCount: number;
  lastSyncDate: string | null;
}> {
  "use step";

  try {
    const lastSyncDate = await getLastActivitySyncDate(accountId);

    if (lastSyncDate) {
      const startDate = toDateOnlyString(lastSyncDate);

      const response = await getAccountActivities(accountId, userCredentials, {
        startDate,
      });
      const activitiesData = response?.data || [];

      return {
        activities: activitiesData,
        activityCount: activitiesData.length,
        lastSyncDate: startDate,
      };
    }

    return { activities: [], activityCount: 0, lastSyncDate: null };
  } catch (error: unknown) {
    const err = error as SnapTradeApiError;
    if (err.response?.status === 429) {
      throw new RetryableError("SnapTrade rate limited", { retryAfter: "1m" });
    }
    throw error;
  }
}

export async function upsertActivitiesStep(
  accountId: string,
  appUserId: string,
  activities: UniversalActivity[],
): Promise<{ upsertedCount: number }> {
  "use step";

  if (activities.length === 0) {
    return { upsertedCount: 0 };
  }

  await upsertAccountActivities(accountId, appUserId, activities);

  return { upsertedCount: activities.length };
}

export async function refreshAccountDataStep(
  accountId: string,
  userCredentials: UserCredentials,
): Promise<{ detailsSuccess: boolean; balancesSuccess: boolean }> {
  "use step";

  // Fetch details first so balances upsert can use the account-level total.
  let detailsData: Account | undefined;
  let detailsSuccess = false;
  try {
    const data = await getUserAccountDetails(accountId, userCredentials);
    if (data) {
      detailsData = data;
      await upsertAccountDetails(accountId, userCredentials.appUserId, data);
      detailsSuccess = true;
    }
  } catch {
    detailsSuccess = false;
  }

  let balancesSuccess = false;
  try {
    const data = await getUserAccountBalance(accountId, userCredentials);
    if (data && Array.isArray(data)) {
      await upsertAccountBalances(accountId, userCredentials.appUserId, data, detailsData);
      balancesSuccess = true;
    }
  } catch {
    balancesSuccess = false;
  }

  return { balancesSuccess, detailsSuccess };
}

/**
 * Seeds today's portfolio snapshot for every SnapTrade account belonging to a
 * user. Called once at link / repair time. Cron handles every subsequent day.
 * Idempotent — re-running just refreshes today's row.
 */
export async function seedTodaySnaptradeSnapshotsStep(userId: string): Promise<void> {
  "use step";
  await upsertAllBalanceSnapshots(userId);
}

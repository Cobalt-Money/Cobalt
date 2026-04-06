import { db } from "@cobalt-web/db";
import {
  brokerageUser,
  brokerageAuthorizations,
  brokerageAccounts,
  brokerageBalances,
  brokeragePositions,
  brokerageOrders,
  brokerageActivities,
  brokerageAccountDetails,
} from "@cobalt-web/db/schema/brokerage";
import { eq, desc, and } from "drizzle-orm";
import type {
  Account,
  AccountHoldingsAccount,
  Balance,
  AccountOrderRecord,
  AccountOrderRecordUniversalSymbol,
  UniversalActivity,
} from "snaptrade-typescript-sdk";

import { extractDateFromISO } from "../lib/date.js";

// ============================================================================
// Shared field-resolution helpers (reduce cyclomatic complexity)
// ============================================================================

interface ResolvedSymbolFields {
  symbolData: Record<string, unknown>;
  currencyData: Record<string, unknown>;
  exchangeData: Record<string, unknown>;
  securityTypeData: Record<string, unknown>;
  tickerSymbol: string;
}

function orNull<T>(value: T | undefined | null): T | null {
  return value ?? null;
}

/** Resolve symbol / currency / exchange / securityType from a position-like record. */
function resolvePositionSymbolFields(
  position: Record<string, unknown>
): ResolvedSymbolFields {
  const sym = (position.symbol as Record<string, unknown>) || {};
  const symbolData = (sym.symbol as Record<string, unknown>) || sym;
  const currencyData =
    (symbolData.currency as Record<string, unknown>) ||
    (position.currency as Record<string, unknown>) ||
    {};
  const exchangeData =
    (symbolData.exchange as Record<string, unknown>) ||
    (position.exchange as Record<string, unknown>) ||
    {};
  const securityTypeData =
    (symbolData.type as Record<string, unknown>) ||
    (position.security_type as Record<string, unknown>) ||
    {};
  const tickerSymbol =
    (symbolData.symbol as string) ||
    (position.raw_symbol as string) ||
    "UNKNOWN";
  return {
    currencyData,
    exchangeData,
    securityTypeData,
    symbolData,
    tickerSymbol,
  };
}

/** Resolve symbol fields from an activity-like record. */
function resolveActivitySymbolFields(
  activity: Record<string, unknown>
): ResolvedSymbolFields {
  const symbolData = (activity.symbol as Record<string, unknown>) || {};
  const currencyData =
    (symbolData.currency as Record<string, unknown>) ||
    (activity.currency as Record<string, unknown>) ||
    {};
  const exchangeData =
    (symbolData.exchange as Record<string, unknown>) ||
    (activity.exchange as Record<string, unknown>) ||
    {};
  const securityTypeData =
    (symbolData.type as Record<string, unknown>) ||
    (activity.security_type as Record<string, unknown>) ||
    {};
  const tickerSymbol =
    (symbolData.symbol as string) || (activity.symbol_ticker as string) || "";
  return {
    currencyData,
    exchangeData,
    securityTypeData,
    symbolData,
    tickerSymbol: tickerSymbol || "",
  };
}

/** Build the common currency / exchange / securityType columns. */
function buildCommonSymbolColumns(
  resolved: ResolvedSymbolFields,
  fallback: Record<string, unknown>
) {
  const { currencyData, exchangeData, securityTypeData, symbolData } = resolved;
  return {
    currencyCode:
      (currencyData.code as string) ||
      (fallback.currency_code as string) ||
      "USD",
    currencyId: orNull(
      (currencyData.id as string) || (fallback.currency_id as string)
    ),
    currencyName:
      (currencyData.name as string) ||
      (fallback.currency_name as string) ||
      "US Dollar",
    exchangeCode: orNull(
      (exchangeData.code as string) || (fallback.exchange_code as string)
    ),
    exchangeId: orNull(
      (exchangeData.id as string) || (fallback.exchange_id as string)
    ),
    exchangeMicCode: orNull(
      (exchangeData.mic_code as string) ||
        (fallback.exchange_mic_code as string)
    ),
    exchangeName: orNull(
      (exchangeData.name as string) || (fallback.exchange_name as string)
    ),
    figiCode: orNull(
      (symbolData.figi_code as string) || (fallback.figi_code as string)
    ),
    securityTypeCode: orNull(
      (securityTypeData.code as string) ||
        (fallback.security_type_code as string)
    ),
    securityTypeDescription: orNull(
      (securityTypeData.description as string) ||
        (fallback.security_type_description as string)
    ),
    securityTypeId: orNull(
      (securityTypeData.id as string) || (fallback.security_type_id as string)
    ),
    symbolDescription: orNull(
      (symbolData.description as string) ||
        (fallback.symbol_description as string)
    ),
    symbolId: orNull(
      (symbolData.id as string) || (fallback.symbol_id as string)
    ),
  };
}

/** Build the shared account-data columns for upsertBrokerageAccountFromWebhook. */
function buildAccountColumns(
  accountData: Account,
  appUserId: string,
  brokerageAuthorizationId: string
) {
  return {
    accountNumber: accountData.number || null,
    accountStatus: accountData.status || "active",
    accountType: accountData.raw_type || "unknown",
    balanceData: serializeJsonb(accountData.balance || null),
    brokerageAuthId: brokerageAuthorizationId,
    cashRestrictions: serializeJsonb(accountData.cash_restrictions || null),
    createdDate: accountData.created_date
      ? new Date(accountData.created_date)
      : new Date(),
    institutionName: accountData.institution_name || "Unknown",
    lastSync: new Date(),
    metaData: serializeJsonb(accountData.meta || null),
    name: accountData.name || "Account",
    portfolioGroup: accountData.portfolio_group || null,
    syncStatus:
      typeof accountData.sync_status === "string"
        ? accountData.sync_status
        : "pending",
    userId: appUserId,
  };
}

/** Build the shared account-details columns for upsertAccountDetailsFromWebhook. */
function buildAccountDetailsColumns(
  detailsData: Account,
  appUserId: string,
  dbAccountId: string,
  snaptradeAccountId: string
) {
  return {
    accountId: dbAccountId,
    balance: serializeJsonb(detailsData.balance || null),
    brokerageAuthorizationId: detailsData.brokerage_authorization || "",
    cashRestrictions: serializeJsonb(detailsData.cash_restrictions || null),
    createdDate: detailsData.created_date
      ? new Date(detailsData.created_date)
      : new Date(),
    institutionName: detailsData.institution_name || "Unknown",
    lastSync: new Date(),
    meta: serializeJsonb(detailsData.meta || null),
    name: detailsData.name || "Account",
    number: detailsData.number || null,
    portfolioGroup: detailsData.portfolio_group || null,
    rawType: detailsData.raw_type || null,
    snapTradeAccountId: snaptradeAccountId,
    status: detailsData.status || "active",
    syncStatus: serializeJsonb(detailsData.sync_status || null),
    userId: appUserId,
  };
}

/** Map a single position record to its DB columns. */
function mapPositionToColumns(
  position: Record<string, unknown>,
  dbAccountId: string,
  snaptradeAccountId: string,
  appUserId: string,
  currentSyncTime: Date
) {
  const resolved = resolvePositionSymbolFields(position);
  const common = buildCommonSymbolColumns(resolved, position);
  const { symbolData, tickerSymbol } = resolved;

  return {
    accountId: dbAccountId,
    averagePurchasePrice:
      toDecimalString(position.average_purchase_price as number) || "0",
    ...common,
    isQuotable:
      (position.is_quotable as boolean) ??
      (symbolData.is_quotable as boolean) ??
      true,
    isTradable:
      (position.is_tradable as boolean) ??
      (symbolData.is_tradable as boolean) ??
      true,
    lastSync: currentSyncTime,
    localId: orNull(
      (position.local_id as string) || (symbolData.local_id as string)
    ),
    openPnl: toDecimalString(position.open_pnl as number) || "0",
    price: toDecimalString(position.price as number) || "0",
    rawSymbol:
      (symbolData.raw_symbol as string) ||
      (position.raw_symbol as string) ||
      tickerSymbol,
    snapTradeAccountId: snaptradeAccountId,
    symbol: tickerSymbol,
    units: toDecimalString(position.units as number) || "0",
    userId: appUserId,
  };
}

/** Resolve the ticker symbol for an order record. */
function resolveOrderTickerSymbol(
  order: AccountOrderRecord,
  symbolData: AccountOrderRecordUniversalSymbol | null
): string {
  let tickerSymbol = symbolData?.symbol || order.symbol;
  if (!tickerSymbol && order.brokerage_order_id) {
    const orderIdParts = order.brokerage_order_id.split("-");
    tickerSymbol = orderIdParts.at(-1) || "UNKNOWN";
  }
  return tickerSymbol || "UNKNOWN";
}

/** Extract currency columns from an order's universal_symbol. */
function buildOrderCurrencyColumns(
  symbolData: AccountOrderRecordUniversalSymbol | null
) {
  const currencyData = symbolData?.currency;
  return {
    currencyCode: currencyData?.code || "USD",
    currencyId: currencyData?.id || null,
    currencyName: currencyData?.name || "US Dollar",
  };
}

/** Extract exchange columns from an order's universal_symbol. */
function buildOrderExchangeColumns(
  symbolData: AccountOrderRecordUniversalSymbol | null
) {
  const exchangeData = symbolData?.exchange;
  return {
    exchangeCode: exchangeData?.code || null,
    exchangeId: exchangeData?.id || null,
    exchangeMicCode: exchangeData?.mic_code || null,
    exchangeName: exchangeData?.name || null,
  };
}

/** Extract security type and identity columns from an order's universal_symbol. */
function buildOrderSecurityColumns(
  symbolData: AccountOrderRecordUniversalSymbol | null
) {
  const securityTypeData = symbolData?.type;
  return {
    figiCode: symbolData?.figi_code || null,
    securityTypeCode: securityTypeData?.code || null,
    securityTypeDescription: securityTypeData?.description || null,
    securityTypeId: securityTypeData?.id || null,
    symbolDescription: symbolData?.description || null,
    symbolId: symbolData?.id || null,
  };
}

/** Extract quantity / price columns from an order. */
function buildOrderQuantityColumns(order: AccountOrderRecord) {
  return {
    canceledQuantity: toDecimalString(order.canceled_quantity) || "0",
    executionPrice: toDecimalString(order.execution_price) || "0",
    filledQuantity: toDecimalString(order.filled_quantity) || "0",
    limitPrice: toDecimalString(order.limit_price) || "0",
    openQuantity: toDecimalString(order.open_quantity) || "0",
    stopPrice: toDecimalString(order.stop_price) || "0",
    totalQuantity: toDecimalString(order.total_quantity) || "0",
  };
}

/** Extract date columns from an order. */
function buildOrderDateColumns(order: AccountOrderRecord) {
  return {
    expirationDate: order.expiration_date
      ? new Date(order.expiration_date)
      : null,
    expiryDate: order.expiry_date ? new Date(order.expiry_date) : null,
    timeExecuted: order.time_executed ? new Date(order.time_executed) : null,
    timePlaced: order.time_placed ? new Date(order.time_placed) : new Date(),
    timeUpdated: order.time_updated ? new Date(order.time_updated) : null,
  };
}

/** Map a single order record to its DB columns. */
function mapOrderToColumns(
  order: AccountOrderRecord,
  dbAccountId: string,
  snaptradeAccountId: string,
  appUserId: string,
  currentSyncTime: Date
) {
  const symbolData = order.universal_symbol || null;
  const tickerSymbol = resolveOrderTickerSymbol(order, symbolData);
  const symbolColumns = {
    ...buildOrderCurrencyColumns(symbolData),
    ...buildOrderExchangeColumns(symbolData),
    ...buildOrderSecurityColumns(symbolData),
  };
  const quantityColumns = buildOrderQuantityColumns(order);
  const dateColumns = buildOrderDateColumns(order);

  return {
    accountId: dbAccountId,
    action: order.action || "buy",
    brokerageOrderId: order.brokerage_order_id || order.id,
    childBrokerageOrderIds: order.child_brokerage_order_ids || null,
    ...symbolColumns,
    ...quantityColumns,
    ...dateColumns,
    isMiniOption: order.is_mini_option || false,
    lastSync: currentSyncTime,
    optionSymbol: order.option_symbol || null,
    optionType: order.option_type || null,
    orderType: order.order_type || "market",
    quoteCurrency: order.quote_currency || null,
    quoteUniversalSymbol: order.quote_universal_symbol || null,
    rawSymbol: symbolData?.raw_symbol || tickerSymbol,
    snapTradeAccountId: snaptradeAccountId,
    status: order.status || "pending",
    strikePrice: order.strike_price || null,
    symbol: tickerSymbol,
    timeInForce: order.time_in_force || "DAY",
    universalSymbol: order.universal_symbol || null,
    userId: appUserId,
  };
}

/** Map a single activity record to its DB columns. */
function mapActivityToColumns(
  activity: UniversalActivity,
  dbAccountId: string,
  snaptradeAccountId: string,
  appUserId: string,
  currentSyncTime: Date
) {
  const resolved = resolveActivitySymbolFields(
    activity as unknown as Record<string, unknown>
  );
  const common = buildCommonSymbolColumns(
    resolved,
    activity as unknown as Record<string, unknown>
  );
  const { symbolData, tickerSymbol } = resolved;

  return {
    accountId: dbAccountId,
    activityId: activity.activity_id || activity.id,
    amount: toDecimalString(activity.amount) || "0",
    ...common,
    description: activity.description || "",
    externalReferenceId: activity.external_reference_id || null,
    fee: toDecimalString(activity.fee) || "0",
    fxRate: toDecimalString(activity.fx_rate) || "0",
    institution: activity.institution || null,
    lastSync: currentSyncTime,
    optionSymbol: activity.option_symbol || null,
    optionType: activity.option_type || null,
    pagination: activity.pagination || null,
    price: toDecimalString(activity.price) || "0",
    rawSymbol:
      (symbolData.raw_symbol as string) || activity.raw_symbol || tickerSymbol,
    settlementDate: activity.settlement_date
      ? extractDateFromISO(activity.settlement_date)
      : null,
    snapTradeAccountId: snaptradeAccountId,
    symbol: activity.symbol || null,
    symbolTicker: tickerSymbol || null,
    tradeDate: activity.trade_date
      ? extractDateFromISO(activity.trade_date)
      : null,
    type: activity.type || "unknown",
    units: toDecimalString(activity.units) || "0",
    userId: appUserId,
  };
}

/**
 * WEBHOOK-ONLY UPSERT FUNCTIONS
 *
 * These functions are designed specifically for webhook handlers.
 * They perform ONLY upsert operations (INSERT ... ON CONFLICT DO UPDATE).
 * They do NOT call any cached functions or perform SELECT queries.
 * They use webhook-provided identifiers directly.
 */

// ============================================================================
// JSON helpers
// ============================================================================

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function serializeJsonb(value: unknown): JsonValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "object") {
    return typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
      ? value
      : String(value);
  }
  try {
    return structuredClone(value) as JsonValue;
  } catch (error) {
    console.error("[serializeJsonb] Failed to serialize value:", error);
    return null;
  }
}

function toDecimalString(
  value: number | string | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === "string" ? value : String(value);
}

// ============================================================================
// CREDENTIAL HELPER (ONLY READ OPERATION ALLOWED)
// ============================================================================

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

export async function getBrokerageAccountDbId(
  snaptradeAccountId: string,
  userId: string
): Promise<string | null> {
  const account = await db
    .select({ id: brokerageAccounts.id })
    .from(brokerageAccounts)
    .where(
      and(
        eq(brokerageAccounts.accountId, snaptradeAccountId),
        eq(brokerageAccounts.userId, userId)
      )
    )
    .limit(1);

  const [first] = account;
  return first ? first.id : null;
}

export async function getLastActivitySyncDateFromWebhook(
  accountId: string
): Promise<Date | null> {
  try {
    const lastActivity = await db
      .select({ lastSync: brokerageActivities.lastSync })
      .from(brokerageActivities)
      .where(eq(brokerageActivities.accountId, accountId))
      .orderBy(desc(brokerageActivities.lastSync))
      .limit(1);

    const [first] = lastActivity;
    return first ? first.lastSync : null;
  } catch (error) {
    console.error(
      `Error getting last activity sync date for account ${accountId}:`,
      error
    );
    return null;
  }
}

// ============================================================================
// BROKERAGE AUTHORIZATION UPSERTS
// ============================================================================

export async function upsertSnaptradeAuthorizationFromWebhook(
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

    const [existingRecord] = existing;
    if (!existingRecord) {
      throw new Error(
        `Authorization not found after length check: ${brokerageAuthorizationId}`
      );
    }
    return existingRecord.id;
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

  if (!inserted) {
    throw new Error(
      `Failed to insert authorization: ${brokerageAuthorizationId}`
    );
  }
  return inserted.id;
}

export async function updateSnaptradeAuthorizationStatusFromWebhook(
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

// ============================================================================
// BROKERAGE ACCOUNT UPSERTS
// ============================================================================

export async function upsertBrokerageAccountFromWebhook(
  accountId: string,
  brokerageAuthorizationId: string,
  appUserId: string,
  accountData: Account
): Promise<void> {
  const columns = buildAccountColumns(
    accountData,
    appUserId,
    brokerageAuthorizationId
  );

  await db
    .insert(brokerageAccounts)
    .values({ accountId, ...columns })
    .onConflictDoUpdate({
      set: { ...columns, syncStatus: columns.syncStatus as string },
      target: brokerageAccounts.accountId,
    });
}

// ============================================================================
// ACCOUNT BALANCES UPSERTS
// ============================================================================

export async function upsertAccountBalancesFromWebhook(
  snaptradeAccountId: string,
  appUserId: string,
  balancesData: Balance[]
): Promise<void> {
  const dbAccountId = await getBrokerageAccountDbId(
    snaptradeAccountId,
    appUserId
  );
  if (!dbAccountId) {
    throw new Error(
      `Account not found or access denied: ${snaptradeAccountId} for user ${appUserId}`
    );
  }

  const currentSyncTime = new Date();

  for (const balance of balancesData) {
    const currencyData = balance.currency || {};

    const balanceData = {
      accountId: dbAccountId,
      buyingPower: toDecimalString(balance.buying_power) || "0",
      cash: toDecimalString(balance.cash) || "0",
      currencyCode: currencyData.code || balance.currency_code || "USD",
      currencyId: currencyData.id || balance.currency_id || null,
      currencyName: currencyData.name || balance.currency_name || "US Dollar",
      lastSync: currentSyncTime,
      snapTradeAccountId: snaptradeAccountId,
      userId: appUserId,
    };

    await db
      .insert(brokerageBalances)
      .values(balanceData)
      .onConflictDoUpdate({
        set: {
          buyingPower: toDecimalString(balance.buying_power) || "0",
          cash: toDecimalString(balance.cash) || "0",
          currencyId: balanceData.currencyId,
          currencyName: balanceData.currencyName,
          lastSync: balanceData.lastSync,
          updatedAt: new Date(),
        },
        target: [brokerageBalances.accountId, brokerageBalances.currencyCode],
      });
  }
}

// ============================================================================
// ACCOUNT POSITIONS UPSERTS
// ============================================================================

export async function upsertAccountPositionsFromWebhook(
  snaptradeAccountId: string,
  appUserId: string,
  positionsData: AccountHoldingsAccount["positions"]
): Promise<void> {
  const dbAccountId = await getBrokerageAccountDbId(
    snaptradeAccountId,
    appUserId
  );
  if (!dbAccountId) {
    throw new Error(
      `Account not found or access denied: ${snaptradeAccountId} for user ${appUserId}`
    );
  }

  if (!positionsData || !Array.isArray(positionsData)) {
    return;
  }

  const currentSyncTime = new Date();

  const positionsToUpsert = positionsData.map((position) =>
    mapPositionToColumns(
      position as unknown as Record<string, unknown>,
      dbAccountId,
      snaptradeAccountId,
      appUserId,
      currentSyncTime
    )
  );

  if (positionsToUpsert.length > 0) {
    try {
      await db.insert(brokeragePositions).values(positionsToUpsert);
    } catch {
      for (const positionData of positionsToUpsert) {
        try {
          await db
            .insert(brokeragePositions)
            .values(positionData)
            .onConflictDoUpdate({
              set: {
                averagePurchasePrice: positionData.averagePurchasePrice,
                currencyCode: positionData.currencyCode,
                currencyId: positionData.currencyId,
                currencyName: positionData.currencyName,
                exchangeCode: positionData.exchangeCode,
                exchangeId: positionData.exchangeId,
                exchangeMicCode: positionData.exchangeMicCode,
                exchangeName: positionData.exchangeName,
                figiCode: positionData.figiCode,
                isQuotable: positionData.isQuotable,
                isTradable: positionData.isTradable,
                lastSync: currentSyncTime,
                localId: positionData.localId,
                openPnl: positionData.openPnl,
                price: positionData.price,
                rawSymbol: positionData.rawSymbol,
                securityTypeCode: positionData.securityTypeCode,
                securityTypeDescription: positionData.securityTypeDescription,
                securityTypeId: positionData.securityTypeId,
                snapTradeAccountId: positionData.snapTradeAccountId,
                symbolDescription: positionData.symbolDescription,
                symbolId: positionData.symbolId,
                units: positionData.units,
                updatedAt: new Date(),
                userId: positionData.userId,
              },
              target: [brokeragePositions.accountId, brokeragePositions.symbol],
            });
        } catch (individualError) {
          console.error(
            `Failed to upsert individual position ${positionData.symbol}:`,
            individualError
          );
        }
      }
    }
  }
}

// ============================================================================
// ACCOUNT ORDERS UPSERTS
// ============================================================================

export async function upsertAccountOrdersFromWebhook(
  snaptradeAccountId: string,
  appUserId: string,
  ordersData: AccountOrderRecord[]
): Promise<void> {
  const dbAccountId = await getBrokerageAccountDbId(
    snaptradeAccountId,
    appUserId
  );
  if (!dbAccountId) {
    throw new Error(
      `Account not found or access denied: ${snaptradeAccountId} for user ${appUserId}`
    );
  }

  const currentSyncTime = new Date();

  const ordersToUpsert = ordersData.map((order) =>
    mapOrderToColumns(
      order,
      dbAccountId,
      snaptradeAccountId,
      appUserId,
      currentSyncTime
    )
  );

  if (ordersToUpsert.length > 0) {
    try {
      await db.insert(brokerageOrders).values(ordersToUpsert);
    } catch {
      for (const orderData of ordersToUpsert) {
        try {
          await db
            .insert(brokerageOrders)
            .values(orderData)
            .onConflictDoUpdate({
              set: {
                accountId: dbAccountId,
                action: orderData.action,
                canceledQuantity: orderData.canceledQuantity,
                childBrokerageOrderIds: orderData.childBrokerageOrderIds,
                currencyCode: orderData.currencyCode,
                currencyId: orderData.currencyId,
                currencyName: orderData.currencyName,
                exchangeCode: orderData.exchangeCode,
                exchangeId: orderData.exchangeId,
                exchangeMicCode: orderData.exchangeMicCode,
                exchangeName: orderData.exchangeName,
                executionPrice: orderData.executionPrice,
                expirationDate: orderData.expirationDate,
                expiryDate: orderData.expiryDate,
                figiCode: orderData.figiCode,
                filledQuantity: orderData.filledQuantity,
                isMiniOption: orderData.isMiniOption,
                lastSync: currentSyncTime,
                limitPrice: orderData.limitPrice,
                openQuantity: orderData.openQuantity,
                optionSymbol: orderData.optionSymbol,
                optionType: orderData.optionType,
                orderType: orderData.orderType,
                quoteCurrency: orderData.quoteCurrency,
                quoteUniversalSymbol: orderData.quoteUniversalSymbol,
                rawSymbol: orderData.rawSymbol,
                securityTypeCode: orderData.securityTypeCode,
                securityTypeDescription: orderData.securityTypeDescription,
                securityTypeId: orderData.securityTypeId,
                snapTradeAccountId: snaptradeAccountId,
                status: orderData.status,
                stopPrice: orderData.stopPrice,
                strikePrice: orderData.strikePrice,
                symbol: orderData.symbol,
                symbolDescription: orderData.symbolDescription,
                symbolId: orderData.symbolId,
                timeExecuted: orderData.timeExecuted,
                timeInForce: orderData.timeInForce,
                timePlaced: orderData.timePlaced,
                timeUpdated: orderData.timeUpdated,
                totalQuantity: orderData.totalQuantity,
                universalSymbol: orderData.universalSymbol,
                userId: appUserId,
              },
              target: brokerageOrders.brokerageOrderId,
            });
        } catch (individualError) {
          console.error(
            `Failed to upsert individual order ${orderData.brokerageOrderId}:`,
            individualError
          );
        }
      }
    }
  }
}

// ============================================================================
// ACCOUNT ACTIVITIES (TRANSACTIONS) UPSERTS
// ============================================================================

export async function upsertAccountActivitiesFromWebhook(
  snaptradeAccountId: string,
  appUserId: string,
  activitiesData: UniversalActivity[]
): Promise<void> {
  const dbAccountId = await getBrokerageAccountDbId(
    snaptradeAccountId,
    appUserId
  );
  if (!dbAccountId) {
    throw new Error(
      `Account not found or access denied: ${snaptradeAccountId} for user ${appUserId}`
    );
  }

  const currentSyncTime = new Date();

  const activitiesToUpsert = activitiesData.map((activity) =>
    mapActivityToColumns(
      activity,
      dbAccountId,
      snaptradeAccountId,
      appUserId,
      currentSyncTime
    )
  );

  if (activitiesToUpsert.length > 0) {
    try {
      await db.insert(brokerageActivities).values(activitiesToUpsert);
    } catch {
      for (const activityData of activitiesToUpsert) {
        try {
          await db
            .insert(brokerageActivities)
            .values(activityData)
            .onConflictDoUpdate({
              set: {
                accountId: dbAccountId,
                amount: activityData.amount,
                currencyCode: activityData.currencyCode,
                currencyId: activityData.currencyId,
                currencyName: activityData.currencyName,
                description: activityData.description,
                exchangeCode: activityData.exchangeCode,
                exchangeId: activityData.exchangeId,
                exchangeMicCode: activityData.exchangeMicCode,
                exchangeName: activityData.exchangeName,
                externalReferenceId: activityData.externalReferenceId,
                fee: activityData.fee,
                figiCode: activityData.figiCode,
                fxRate: activityData.fxRate,
                institution: activityData.institution,
                lastSync: currentSyncTime,
                optionSymbol: activityData.optionSymbol,
                optionType: activityData.optionType,
                pagination: activityData.pagination,
                price: activityData.price,
                rawSymbol: activityData.rawSymbol,
                securityTypeCode: activityData.securityTypeCode,
                securityTypeDescription: activityData.securityTypeDescription,
                securityTypeId: activityData.securityTypeId,
                settlementDate: activityData.settlementDate,
                snapTradeAccountId: snaptradeAccountId,
                symbol: activityData.symbol,
                symbolDescription: activityData.symbolDescription,
                symbolId: activityData.symbolId,
                symbolTicker: activityData.symbolTicker,
                tradeDate: activityData.tradeDate,
                type: activityData.type,
                units: activityData.units,
                userId: appUserId,
              },
              target: brokerageActivities.activityId,
            });
        } catch (individualError) {
          console.error(
            `Failed to upsert individual activity ${activityData.activityId}:`,
            individualError
          );
        }
      }
    }
  }
}

// ============================================================================
// ACCOUNT DETAILS UPSERTS
// ============================================================================

export async function upsertAccountDetailsFromWebhook(
  snaptradeAccountId: string,
  appUserId: string,
  detailsData: Account
): Promise<void> {
  const dbAccountId = await getBrokerageAccountDbId(
    snaptradeAccountId,
    appUserId
  );
  if (!dbAccountId) {
    throw new Error(
      `Account not found or access denied: ${snaptradeAccountId} for user ${appUserId}`
    );
  }

  const columns = buildAccountDetailsColumns(
    detailsData,
    appUserId,
    dbAccountId,
    snaptradeAccountId
  );

  await db.insert(brokerageAccountDetails).values(columns).onConflictDoUpdate({
    set: columns,
    target: brokerageAccountDetails.snapTradeAccountId,
  });
}

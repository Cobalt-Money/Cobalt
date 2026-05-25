import { z } from "@hono/zod-openapi";

/**
 * Shared public-API schemas. Everything visible to SDK consumers passes
 * through here — provider-specific shapes (Plaid, SnapTrade) stay out of this
 * file so swapping providers is a server-side concern, not a breaking change.
 */

export const type = z
  .enum(["bank", "credit_card", "investment", "loan", "other"])
  .openapi("AccountType");

/**
 * Demo of the `.transform().pipe()` pattern. Input schema accepts the internal
 * `AccountListItem` shape from `@cobalt-web/server-data/accounts/queries`; the
 * transform renames + enum-maps; output schema is what SDK consumers see and
 * what OpenAPI documents.
 *
 * Drops the need for a separate `toAccount` mapper in `accounts.ts`.
 */
const accountInputSchema = z.object({
  creditLimit: z.number().nullable(),
  currency: z.string().nullable(),
  current: z.number().nullable(),
  id: z.string(),
  institutionName: z.string().nullable(),
  mask: z.string().nullable(),
  name: z.string(),
  type: z.string(),
});

const accountOutputSchema = z.object({
  balance: z.number().nullable().openapi({
    description:
      "Current balance in the account's currency. Null when the provider has not reported one.",
  }),
  creditLimit: z.number().nullable().openapi({
    description: "Credit limit for credit-card accounts. Null for non-credit accounts.",
  }),
  currency: z.string().nullable().openapi({ example: "USD" }),
  id: z.string().openapi({ description: "Stable account identifier." }),
  institution: z.string().nullable().openapi({
    description: "Name of the institution holding the account.",
  }),
  mask: z.string().nullable().openapi({ description: "Last 4 digits when available." }),
  name: z.string().openapi({ description: "Account display name." }),
  type,
});

function mapAccountType(internal: string): z.infer<typeof type> {
  switch (internal) {
    case "depository": {
      return "bank";
    }
    case "credit": {
      return "credit_card";
    }
    case "brokerage":
    case "investment": {
      return "investment";
    }
    case "loan": {
      return "loan";
    }
    default: {
      return "other";
    }
  }
}

export const accountSchema = accountInputSchema
  .transform((row) => ({
    balance: row.current,
    creditLimit: row.creditLimit,
    currency: row.currency,
    id: row.id,
    institution: row.institutionName,
    mask: row.mask,
    name: row.name,
    type: mapAccountType(row.type),
  }))
  .pipe(accountOutputSchema)
  .openapi("Account");

export const transactionSchema = z
  .object({
    accountId: z.string().openapi({
      description: "Identifier of the account this transaction belongs to.",
    }),
    amount: z.number().openapi({
      description:
        "Signed amount. Positive = money out (debit / spending), negative = money in (credit / refund).",
    }),
    category: z
      .string()
      .nullable()
      .openapi({ description: "Category name; null if uncategorized." }),
    date: z.string().openapi({ description: "Transaction date (YYYY-MM-DD)." }),
    id: z.string(),
    merchant: z.string().nullable(),
    name: z.string().openapi({ description: "Raw description from the institution." }),
    notes: z.string().nullable().openapi({
      description: "Additional details regarding the transaction. Supports Markdown.",
      example: "**Reimbursable** — paid for team lunch, expense via Expensify",
    }),
    pending: z.boolean(),
    tagIds: z.array(z.string()),
  })
  .openapi("Transaction");

export const balanceSnapshotSchema = z
  .object({
    accountId: z.string(),
    availableBalance: z.number().nullable().openapi({
      description: "Funds available to spend (current minus pending). Null when unreported.",
    }),
    creditLimit: z.number().nullable().openapi({
      description: "Credit limit for credit-card accounts. Null for non-credit accounts.",
    }),
    currentBalance: z.number().openapi({
      description: "Posted balance at end-of-day.",
    }),
    date: z.string().openapi({ example: "2026-05-22" }),
    id: z.string(),
  })
  .openapi("BalanceSnapshot");

export const activitySchema = z
  .object({
    accountId: z.string(),
    amount: z.number().nullable().openapi({
      description:
        "Cash impact. Positive = cash in (sell, dividend), negative = cash out (buy, fee).",
    }),
    currency: z.string().nullable(),
    description: z.string().nullable(),
    fee: z.number().nullable(),
    id: z.string(),
    price: z.number().nullable(),
    settlementDate: z.string().nullable(),
    symbol: z.string().nullable(),
    tradeDate: z.string().nullable(),
    type: z.string().nullable().openapi({
      description: "Activity kind (BUY, SELL, DIVIDEND, FEE, etc.). Provider-defined.",
    }),
    units: z.number().nullable(),
  })
  .openapi("Activity");

export const portfolioSnapshotSchema = z
  .object({
    accountId: z.string(),
    date: z.string().openapi({ example: "2026-05-22" }),
    id: z.string(),
    value: z.number().openapi({ description: "Total portfolio value at end-of-day." }),
  })
  .openapi("PortfolioSnapshot");

/**
 * Provider returns numeric fields as strings ("12.3456"). Coerce to number for
 * SDK ergonomics. Returns null on missing/invalid so consumers can branch on
 * `value == null` instead of pattern-matching strings.
 */
function num(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") {
    return null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const positionInputSchema = z.object({
  accountId: z.string(),
  averagePurchasePrice: z.string().nullable(),
  currencyCode: z.string().nullable(),
  id: z.string(),
  openPnl: z.string().nullable(),
  price: z.string().nullable(),
  symbol: z.string().nullable(),
  symbolDescription: z.string().nullable(),
  units: z.string().nullable(),
});

const positionOutputSchema = z
  .object({
    accountId: z.string().openapi({ description: "Account this position belongs to." }),
    averagePrice: z.number().nullable().openapi({ description: "Cost basis per share." }),
    currency: z.string().nullable(),
    description: z.string().nullable().openapi({ description: "Security long name." }),
    id: z.string(),
    marketValue: z.number().nullable().openapi({ description: "units × price." }),
    openPnl: z.number().nullable().openapi({ description: "Unrealized profit/loss." }),
    price: z.number().nullable().openapi({ description: "Latest reported price per share." }),
    symbol: z.string().nullable().openapi({ description: "Ticker symbol (e.g. AAPL)." }),
    units: z.number().nullable().openapi({ description: "Quantity held." }),
  })
  .openapi("Position");

export const positionSchema = positionInputSchema
  .transform((p) => {
    const units = num(p.units);
    const price = num(p.price);
    return {
      accountId: p.accountId,
      averagePrice: num(p.averagePurchasePrice),
      currency: p.currencyCode,
      description: p.symbolDescription,
      id: p.id,
      marketValue: units !== null && price !== null ? units * price : null,
      openPnl: num(p.openPnl),
      price,
      symbol: p.symbol,
      units,
    };
  })
  .pipe(positionOutputSchema);

export const categorySchema = z
  .object({
    excludeFromInsights: z.boolean().nullable().openapi({
      description:
        "When true, transactions in this category are excluded from spending insights (e.g. transfers).",
    }),
    groupId: z.string().nullable().openapi({ description: "Parent category group id." }),
    hidden: z.boolean().nullable(),
    iconKey: z.string().nullable(),
    id: z.string(),
    name: z.string(),
    systemKey: z.string().nullable().openapi({
      description:
        "Stable identifier for seeded system categories (e.g. `groceries`). Null for user-created categories.",
    }),
  })
  .openapi("Category");

export const categoryGroupSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    systemKey: z.string().nullable(),
  })
  .openapi("CategoryGroup");

export const recurringStreamSchema = z
  .object({
    accountId: z.string(),
    averageAmount: z.number(),
    category: categorySchema.nullable(),
    description: z.string().nullable(),
    firstDate: z.string().nullable(),
    frequency: z.string().openapi({
      description: "Detected frequency (e.g. WEEKLY, MONTHLY, ANNUALLY).",
    }),
    id: z.string(),
    isActive: z.boolean(),
    lastAmount: z.number(),
    lastDate: z.string().nullable(),
    merchantName: z.string().nullable(),
    predictedNextDate: z.string().nullable().openapi({
      description: "Best-effort guess at the next charge date.",
    }),
    status: z.string().nullable().openapi({ description: "MATURE, EARLY_DETECTION, etc." }),
    streamType: z.string().nullable().openapi({ description: "INFLOW or OUTFLOW." }),
  })
  .openapi("RecurringStream");

export const spendingBucketSchema = z
  .object({
    amount: z.number().openapi({ description: "Total spending in the bucket window." }),
    date: z.string().openapi({ description: "Bucket start date." }),
  })
  .openapi("SpendingBucket");

export const spendingSchema = z
  .object({
    averageLabel: z.enum(["daily", "weekly", "monthly", "yearly"]),
    averageSpending: z.number(),
    buckets: z.array(spendingBucketSchema),
    totalSpending: z.number(),
  })
  .openapi("SpendingItem");

export const tagSchema = z
  .object({
    archivedAt: z.string().nullable(),
    color: z.string().nullable(),
    createdAt: z.string(),
    id: z.string(),
    name: z.string(),
  })
  .openapi("Tag");

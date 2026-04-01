import { db } from "@cobalt-web/db";

type BankAccountRelationalWhere = NonNullable<
  Parameters<typeof db.query.bankAccount.findMany>[0]
>["where"];

type InvestmentPositionRelationalWhere = NonNullable<
  Parameters<typeof db.query.investmentPosition.findMany>[0]
>["where"];

type InvestmentActivityRelationalWhere = NonNullable<
  Parameters<typeof db.query.investmentActivity.findMany>[0]
>["where"];

// ── Investment accounts (Plaid) ───────────────────────────────────────

export async function getPlaidInvestmentAccountsByUserId(userId: string) {
  const rows = await db.query.bankAccount.findMany({
    where: {
      connection: { userId: { eq: userId } },
      type: { eq: "investment" },
    } satisfies BankAccountRelationalWhere,
    with: {
      balances: {
        limit: 1,
        orderBy: { updatedAt: "desc" },
      },
      connection: {
        with: {
          institution: true,
        },
      },
    },
  });

  return rows.map((row) => {
    const [balance] = row.balances;
    const inst = row.connection.institution;
    const currency =
      balance?.isoCurrencyCode ?? balance?.unofficialCurrencyCode ?? null;

    return {
      accountName: row.name,
      availableBalance: balance?.available ?? null,
      currency,
      currentBalance: balance?.current ?? null,
      institutionId: row.connection.institutionId,
      institutionLogo: inst?.logo ?? null,
      institutionName: row.connection.institutionName,
      institutionUrl: inst?.url ?? null,
      itemId: row.plaidItemId,
      mask: row.mask,
      plaidAccountId: row.plaidAccountId,
      subtype: row.subtype,
      type: row.type,
      updatedAt: balance?.updatedAt ?? null,
    };
  });
}

// ── Holdings ────────────────────────────────────────────────────────

export async function getPlaidHoldingsByUserId(
  userId: string,
  accountId?: string
) {
  const parts: InvestmentPositionRelationalWhere[] = [
    {
      account: {
        connection: {
          userId: { eq: userId },
        },
      },
    },
  ];

  if (accountId) {
    parts.push({ plaidAccountId: { eq: accountId } });
  }

  const rows = await db.query.investmentPosition.findMany({
    where: { AND: parts } as InvestmentPositionRelationalWhere,
    with: {
      account: {
        with: {
          connection: true,
        },
      },
      security: true,
    },
  });

  return rows.flatMap((row) => {
    if (!row.account || !row.security) {
      return [];
    }

    const { account } = row;
    const sec = row.security;
    const conn = account.connection;

    return [
      {
        accountName: account.name,
        closePrice: sec.closePrice,
        closePriceAsOf: sec.closePriceAsOf,
        costBasis: row.costBasis,
        holdingUpdatedAt: row.updatedAt,
        id: row.id,
        industry: sec.industry,
        institutionName: conn.institutionName,
        institutionPrice: row.institutionPrice,
        institutionPriceAsOf: row.institutionPriceAsOf,
        institutionValue: row.institutionValue,
        isCashEquivalent: sec.isCashEquivalent,
        isoCurrencyCode: row.isoCurrencyCode,
        plaidAccountId: row.plaidAccountId,
        quantity: row.quantity,
        sector: sec.sector,
        securityId: row.securityId,
        securityName: sec.name,
        securitySubtype: sec.subtype,
        securityType: sec.type,
        tickerSymbol: sec.tickerSymbol,
        vestedQuantity: row.vestedQuantity,
        vestedValue: row.vestedValue,
      },
    ];
  });
}

// ── Investment transactions ───────────────────────────────────────────

export async function getPlaidInvestmentTransactionsByUserId(
  userId: string,
  accountId?: string,
  limit = 50
) {
  const parts: InvestmentActivityRelationalWhere[] = [
    {
      account: {
        connection: {
          userId: { eq: userId },
        },
      },
    },
  ];

  if (accountId) {
    parts.push({ plaidAccountId: { eq: accountId } });
  }

  const rows = await db.query.investmentActivity.findMany({
    limit,
    orderBy: { date: "desc" },
    where: { AND: parts } as InvestmentActivityRelationalWhere,
    with: {
      account: {
        with: {
          connection: true,
        },
      },
      security: true,
    },
  });

  return rows.flatMap((row) => {
    if (!row.account) {
      return [];
    }

    const { account } = row;
    const sec = row.security;

    return [
      {
        accountName: account.name,
        amount: row.amount,
        date: row.date,
        fees: row.fees,
        id: row.id,
        investmentTransactionId: row.investmentTransactionId,
        isoCurrencyCode: row.isoCurrencyCode,
        name: row.name,
        plaidAccountId: row.plaidAccountId,
        price: row.price,
        quantity: row.quantity,
        securityId: row.securityId,
        securityName: sec?.name ?? null,
        securityType: sec?.type ?? null,
        subtype: row.subtype,
        tickerSymbol: sec?.tickerSymbol ?? null,
        type: row.type,
      },
    ];
  });
}

export type PlaidInvestmentAccountRow = Awaited<
  ReturnType<typeof getPlaidInvestmentAccountsByUserId>
>[number];
export type PlaidHoldingRow = Awaited<
  ReturnType<typeof getPlaidHoldingsByUserId>
>[number];
export type PlaidInvestmentTransactionRow = Awaited<
  ReturnType<typeof getPlaidInvestmentTransactionsByUserId>
>[number];

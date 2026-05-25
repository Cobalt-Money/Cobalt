import { db } from "@cobalt-web/db";

export async function getRecurringTransactions(userId: string) {
  const rows = await db.query.recurring.findMany({
    orderBy: { lastDate: "desc" },
    where: {
      isActive: { eq: true },
      userId: { eq: userId },
    },
    with: {
      account: {
        columns: { id: true, name: true, subtype: true, type: true },
        with: {
          plaidConnection: {
            columns: {},
            with: {
              institution: {
                columns: { logo: true, name: true, url: true },
              },
            },
          },
        },
      },
      category: {
        columns: { iconKey: true, id: true, name: true, systemKey: true },
        with: {
          group: {
            columns: { name: true, systemKey: true },
          },
        },
      },
    },
  });

  return rows.map((row) => {
    const inst = row.account.plaidConnection?.institution ?? null;
    const cat = row.category ?? null;
    return {
      accountId: row.account.id,
      accountName: row.account.name,
      accountSubtype: row.account.subtype,
      accountType: row.account.type,
      averageAmount: Number(row.averageAmount),
      category: cat
        ? {
            groupName: cat.group.name,
            groupSystemKey: cat.group.systemKey,
            iconKey: cat.iconKey,
            id: cat.id,
            name: cat.name,
            systemKey: cat.systemKey,
          }
        : null,
      description: row.description,
      firstDate: row.firstDate,
      frequency: row.frequency,
      id: row.id,
      institutionLogo: inst?.logo ?? null,
      institutionName: inst?.name ?? null,
      institutionUrl: inst?.url ?? null,
      isActive: row.isActive,
      lastAmount: Number(row.lastAmount),
      lastDate: row.lastDate,
      merchantName: row.merchantName,
      predictedNextDate: row.predictedNextDate,
      status: row.status,
      streamId: row.externalId,
      streamType: row.streamType as "inflow" | "outflow",
      transactionIds: row.transactionIds,
      updatedAt: row.updatedAt?.toISOString() ?? null,
    };
  });
}

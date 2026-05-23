import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { snaptradeAuthorization } from "@cobalt-web/db/schema/providers/snaptrade/authorization";
import { ALERT_SOURCES } from "@cobalt-web/db/schema/users/alerts";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { formatAlert } from "./_shared/formatter.js";
import type { AlertDTO } from "./schemas.js";

/**
 * Active alerts for a user, newest first. An alert is active until its
 * underlying connection is repaired (resolvedAt set by the webhook /
 * reconnect flow).
 *
 * `title` and `message` are derived via `formatAlert` using the institution
 * name resolved at read time from the live connection rows:
 *   - source=plaid:     plaid_connection.institution_name keyed by plaid_item_id
 *   - source=snaptrade: financial_account.institution_name attached to the matching authorization
 *
 * Persisted `metadata.institutionName` is no longer authoritative for the
 * rendered copy. The column stays because `metadata.institutionLogo` is
 * still consumed by the UI.
 */
export async function getActiveAlerts(userId: string): Promise<AlertDTO[]> {
  const rows = await db.query.userAlerts.findMany({
    orderBy: { createdAt: "desc" },
    where: {
      resolvedAt: { isNull: true },
      userId: { eq: userId },
    },
  });

  if (rows.length === 0) {
    return [];
  }

  const plaidItemIds = rows
    .filter((r) => r.source === ALERT_SOURCES.PLAID && r.sourceId)
    .map((r) => r.sourceId as string);
  const snaptradeAuthIds = rows
    .filter((r) => r.source === ALERT_SOURCES.SNAPTRADE && r.sourceId)
    .map((r) => r.sourceId as string);

  function loadPlaidNames() {
    if (plaidItemIds.length === 0) {
      return [];
    }
    return db
      .select({
        institutionName: plaidConnection.institutionName,
        plaidItemId: plaidConnection.plaidItemId,
      })
      .from(plaidConnection)
      .where(inArray(plaidConnection.plaidItemId, plaidItemIds));
  }
  function loadSnaptradeNames() {
    if (snaptradeAuthIds.length === 0) {
      return [];
    }
    return db
      .selectDistinct({
        authorizationId: snaptradeAuthorization.authorizationId,
        institutionName: financialAccount.institutionName,
      })
      .from(financialAccount)
      .innerJoin(
        snaptradeAuthorization,
        eq(financialAccount.snaptradeAuthorizationId, snaptradeAuthorization.id),
      )
      .where(
        and(
          inArray(snaptradeAuthorization.authorizationId, snaptradeAuthIds),
          isNotNull(financialAccount.institutionName),
        ),
      );
  }
  const [plaidConnections, snaptradeAccounts] = await Promise.all([
    loadPlaidNames(),
    loadSnaptradeNames(),
  ]);

  const plaidNameById = new Map(
    plaidConnections.map((row) => [row.plaidItemId, row.institutionName ?? null]),
  );
  const snaptradeNameByAuthId = new Map(
    snaptradeAccounts.map((row) => [row.authorizationId, row.institutionName ?? null]),
  );

  const resolveInstitutionName = (source: string, sourceId: string | null): string | null => {
    if (!sourceId) {
      return null;
    }
    if (source === ALERT_SOURCES.PLAID) {
      return plaidNameById.get(sourceId) ?? null;
    }
    if (source === ALERT_SOURCES.SNAPTRADE) {
      return snaptradeNameByAuthId.get(sourceId) ?? null;
    }
    return null;
  };

  return rows.map((row) => {
    const metadata = (row.metadata ?? null) as Record<string, unknown> | null;
    const institutionName = resolveInstitutionName(row.source, row.sourceId);
    const { title, message } = formatAlert({ institutionName, type: row.type });

    return {
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      message,
      metadata,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      source: row.source,
      sourceId: row.sourceId,
      title,
      type: row.type,
      userId: row.userId,
    };
  });
}

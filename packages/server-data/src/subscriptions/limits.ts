import { db } from "@cobalt-web/db";

import { userHasActiveSubscription } from "./queries.js";

export const MODELS = {
  haiku: "anthropic/claude-haiku-4.5",
  opus: "anthropic/claude-opus-4.7",
  sonnet: "anthropic/claude-sonnet-4.6",
} as const;

export type ModelSlug = (typeof MODELS)[keyof typeof MODELS];

export interface TierLimits {
  readonly analystMode: boolean;
  readonly connections: number;
  readonly csvExport: boolean;
  readonly documents: number;
  readonly extendedThinking: boolean;
  readonly mcpEnabled: boolean;
  readonly models: readonly ModelSlug[];
}

export const FREE_LIMITS: TierLimits = {
  analystMode: false,
  connections: 1,
  csvExport: false,
  documents: 5,
  extendedThinking: false,
  mcpEnabled: true,
  models: [MODELS.haiku],
};

export const PRO_LIMITS: TierLimits = {
  analystMode: true,
  connections: Number.POSITIVE_INFINITY,
  csvExport: true,
  documents: Number.POSITIVE_INFINITY,
  extendedThinking: true,
  mcpEnabled: true,
  models: [MODELS.haiku, MODELS.sonnet, MODELS.opus],
};

export async function getUserLimits(userId: string): Promise<TierLimits> {
  return (await userHasActiveSubscription(userId)) ? PRO_LIMITS : FREE_LIMITS;
}

/**
 * Pooled count of active Plaid + SnapTrade connections for a user.
 * Plaid: excludes rows marked pendingDisconnectAt (free slot once flagged).
 * SnapTrade: excludes disabled authorizations.
 */
export async function userConnectionCount(userId: string): Promise<number> {
  const [plaidRows, snapRows] = await Promise.all([
    db.query.plaidConnection.findMany({
      columns: { id: true },
      where: { pendingDisconnectAt: { isNull: true }, userId: { eq: userId } },
    }),
    db.query.snaptradeAuthorization.findMany({
      columns: { id: true },
      where: { isDisabled: { eq: false }, userId: { eq: userId } },
    }),
  ]);
  return plaidRows.length + snapRows.length;
}

export async function userCanAddConnection(userId: string): Promise<boolean> {
  const [limits, count] = await Promise.all([getUserLimits(userId), userConnectionCount(userId)]);
  return count < limits.connections;
}

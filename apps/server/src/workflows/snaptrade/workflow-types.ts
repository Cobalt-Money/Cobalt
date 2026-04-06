import type { HoldingsDetails } from "./steps";

// ============================================================================
// SHARED TYPES
// ============================================================================

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

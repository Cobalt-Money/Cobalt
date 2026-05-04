import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@cobalt-web/env/server";
import { Hono } from "hono";
import { start } from "workflow/api";

import {
  snaptradeConnectionAddedWorkflow,
  snaptradeConnectionBrokenWorkflow,
  snaptradeConnectionDeletedWorkflow,
  snaptradeConnectionFixedWorkflow,
  snaptradeConnectionUpdatedWorkflow,
  snaptradeHoldingsUpdatedWorkflow,
} from "../workflows/snaptrade/connection/workflow.js";
import {
  snaptradeTransactionsInitialWorkflow,
  snaptradeTransactionsUpdatedWorkflow,
} from "../workflows/snaptrade/transactions/workflow.js";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function sortKeysRecursively(obj: JsonValue): JsonValue {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sortKeysRecursively(item));
  }

  const sorted: Record<string, JsonValue> = {};
  for (const key of Object.keys(obj).toSorted()) {
    const val = (obj as Record<string, JsonValue | undefined>)[key];
    if (val !== undefined) {
      sorted[key] = sortKeysRecursively(val);
    }
  }
  return sorted;
}

function verifySignature(rawBody: string, signature: string): boolean {
  const clientSecret = env.SNAPTRADE_CONSUMER_KEY;
  const payload = JSON.parse(rawBody) as JsonValue;
  const normalized = sortKeysRecursively(payload);
  const sigContent = JSON.stringify(normalized);
  const sigDigest = createHmac("sha256", clientSecret)
    .update(sigContent)
    .digest("base64");
  // Constant-time compare to avoid signature-timing leaks.
  const a = Buffer.from(sigDigest);
  const b = Buffer.from(signature);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

const MAX_EVENT_AGE_SEC = 300;
const FUTURE_SKEW_SEC = 60;

/**
 * Reject events whose `eventTimestamp` is older than 5 minutes (replay) or
 * more than 60s in the future (clock skew). Per SnapTrade webhook docs.
 */
function isFreshEvent(eventTimestamp: unknown): boolean {
  if (typeof eventTimestamp !== "string") {
    return false;
  }
  const parsed = new Date(eventTimestamp).getTime();
  if (Number.isNaN(parsed)) {
    return false;
  }
  const ageSec = (Date.now() - parsed) / 1000;
  return ageSec <= MAX_EVENT_AGE_SEC && ageSec >= -FUTURE_SKEW_SEC;
}

interface SnaptradeEventPayload {
  eventType: string;
  userId: string;
  brokerageAuthorizationId?: string;
  brokerageId?: string;
  accountId?: string;
  body: Record<string, unknown>;
}

async function dispatchSnaptradeEvent(
  payload: SnaptradeEventPayload
): Promise<void> {
  const {
    eventType,
    userId,
    brokerageAuthorizationId = "",
    brokerageId = "",
    accountId = "",
    body,
  } = payload;

  switch (eventType) {
    case "CONNECTION_ADDED": {
      await start(snaptradeConnectionAddedWorkflow, [
        {
          brokerageAuthorizationId,
          brokerageId,
          userId,
        },
      ]);
      console.log(
        `[snaptrade] Triggered CONNECTION_ADDED workflow for user: ${userId}`
      );
      break;
    }
    case "CONNECTION_UPDATED": {
      await start(snaptradeConnectionUpdatedWorkflow, [
        { brokerageAuthorizationId, userId },
      ]);
      console.log(
        `[snaptrade] Triggered CONNECTION_UPDATED workflow for user: ${userId}`
      );
      break;
    }
    case "CONNECTION_BROKEN": {
      await start(snaptradeConnectionBrokenWorkflow, [
        { brokerageAuthorizationId, userId },
      ]);
      console.log(
        `[snaptrade] Triggered CONNECTION_BROKEN workflow for user: ${userId}`
      );
      break;
    }
    case "CONNECTION_FIXED": {
      await start(snaptradeConnectionFixedWorkflow, [
        { brokerageAuthorizationId, userId },
      ]);
      console.log(
        `[snaptrade] Triggered CONNECTION_FIXED workflow for user: ${userId}`
      );
      break;
    }
    case "CONNECTION_DELETED": {
      await start(snaptradeConnectionDeletedWorkflow, [
        { brokerageAuthorizationId, userId },
      ]);
      console.log(
        `[snaptrade] Triggered CONNECTION_DELETED workflow for user: ${userId}`
      );
      break;
    }
    case "ACCOUNT_HOLDINGS_UPDATED": {
      await start(snaptradeHoldingsUpdatedWorkflow, [
        {
          accountId,
          brokerageAuthorizationId,
          details: (body as { details?: unknown }).details as Parameters<
            typeof snaptradeHoldingsUpdatedWorkflow
          >[0]["details"],
          userId,
        },
      ]);
      console.log(
        `[snaptrade] Triggered ACCOUNT_HOLDINGS_UPDATED workflow for account: ${accountId}`
      );
      break;
    }
    case "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE": {
      await start(snaptradeTransactionsInitialWorkflow, [
        {
          accountId,
          brokerageAuthorizationId,
          userId,
        },
      ]);
      console.log(
        `[snaptrade] Triggered ACCOUNT_TRANSACTIONS_INITIAL_UPDATE workflow for account: ${accountId}`
      );
      break;
    }
    case "ACCOUNT_TRANSACTIONS_UPDATED": {
      await start(snaptradeTransactionsUpdatedWorkflow, [
        {
          accountId,
          brokerageAuthorizationId,
          userId,
        },
      ]);
      console.log(
        `[snaptrade] Triggered ACCOUNT_TRANSACTIONS_UPDATED workflow for account: ${accountId}`
      );
      break;
    }
    default: {
      console.log(`[snaptrade] Ignoring unhandled event type: ${eventType}`);
    }
  }
}

export const snaptradeWebhookRouter = new Hono().post("/", async (c) => {
  try {
    const rawBody = await c.req.text();
    const signature =
      c.req.header("Signature") ?? c.req.header("signature") ?? null;

    if (!signature) {
      console.error("[snaptrade] Missing Signature header");
      return c.json({ error: "Missing Signature header" }, 401);
    }

    try {
      if (!verifySignature(rawBody, signature)) {
        console.error("[snaptrade] Signature verification failed");
        return c.json({ error: "Unauthorized" }, 401);
      }
    } catch (sigError) {
      console.error("[snaptrade] Signature verification error:", sigError);
      return c.json({ error: "Invalid signature" }, 401);
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const {
      eventType,
      userId,
      brokerageAuthorizationId,
      brokerageId,
      accountId,
    } = body as {
      eventType?: string;
      userId?: string;
      brokerageAuthorizationId?: string;
      brokerageId?: string;
      accountId?: string;
    };

    if (!userId || !eventType) {
      console.error(
        "[snaptrade] Invalid webhook payload - missing required fields",
        {
          eventType: eventType ?? "missing",
          userId: userId ?? "missing",
        }
      );
      return c.json({ error: "Invalid payload" }, 400);
    }

    // Replay protection: drop events whose eventTimestamp is stale or far-future.
    if (!isFreshEvent((body as { eventTimestamp?: unknown }).eventTimestamp)) {
      console.error("[snaptrade] Stale or missing eventTimestamp", {
        eventTimestamp: (body as { eventTimestamp?: unknown }).eventTimestamp,
        eventType,
      });
      return c.json({ error: "Stale event" }, 401);
    }

    console.log(`[snaptrade] Received webhook: ${eventType}`, {
      accountId: accountId ?? "N/A",
      brokerageAuthorizationId,
      userId,
    });

    await dispatchSnaptradeEvent({
      accountId,
      body,
      brokerageAuthorizationId,
      brokerageId,
      eventType,
      userId,
    });

    return c.json({ status: "processing" });
  } catch (error) {
    console.error("[snaptrade] Webhook processing error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

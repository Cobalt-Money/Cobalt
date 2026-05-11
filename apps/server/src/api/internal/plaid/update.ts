import { createLinkTokenForUpdate } from "@cobalt-web/server-data/providers/plaid/link/actions";
import { getAccessTokenForItem } from "@cobalt-web/server-data/providers/plaid/link/queries";
import {
  errorResponseSchema,
  linkTokenResponseSchema,
  updateLinkTokenBodySchema,
} from "@cobalt-web/server-data/providers/plaid/link/schemas";
import { createRoute } from "@hono/zod-openapi";
import { v7 as uuidv7 } from "uuid";
import { start } from "workflow/api";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { plaidAddAccountWorkflow } from "../../../workflows/plaid/sync/workflow.js";
import { requireAuth } from "../middleware.js";

const updateLinkTokenRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/link-token/update",
  request: {
    body: {
      content: {
        "application/json": { schema: updateLinkTokenBodySchema },
      },
    },
  },
  responses: {
    200: jsonContent(
      linkTokenResponseSchema,
      "Link token minted; workflow parked on hook. Client must echo the Plaid Link outcome via /resolveLink",
    ),
    404: jsonContent(errorResponseSchema, "Item not found"),
    422: validationErrorResponse(updateLinkTokenBodySchema),
    500: jsonContent(errorResponseSchema, "Server error"),
  },
  summary: "Mint an update-mode link token and start the parked workflow",
  tags: ["Plaid"],
});

const updateRouter = createApp().openapi(updateLinkTokenRoute, async (c) => {
  const { mode, plaidItemId } = c.req.valid("json");
  const userId = c.var.user.id;

  if (mode !== "reauth") {
    // add-accounts / add-products are detected upfront by /createLinkToken
    // (Scenario C). Reject other modes here so unsupported paths can't
    // sneak through.
    return c.json({ error: `mode '${mode}' not supported` }, 500);
  }

  try {
    const accessToken = await getAccessTokenForItem(userId, plaidItemId);
    const tokenResult = await createLinkTokenForUpdate(accessToken, userId, "reauth");
    const hookToken = uuidv7();
    const run = await start(plaidAddAccountWorkflow, [
      {
        hookToken,
        reauthMode: { accessToken, plaidItemId },
        userId,
      },
    ]);
    return c.json(
      {
        hookToken,
        link_token: tokenResult.link_token,
        mode: "reauth" as const,
        plaidItemId,
        runId: run.runId,
      },
      200,
    );
  } catch (error) {
    console.error("[/link-token/update] failed", error);
    const message = error instanceof Error ? error.message : "Error generating link token";
    if (message.includes("not found") || message.includes("access denied")) {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});

export { updateRouter };

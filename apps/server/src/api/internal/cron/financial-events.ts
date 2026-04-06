import { OpenAPIHono } from "@hono/zod-openapi";
import { start } from "workflow/api";

import { processFinancialEventWorkflow } from "@/workflows/financial-events/workflow";

export const financialEventsCronRouter = new OpenAPIHono();

/**
 * POST /financial-events — trigger processing for a batch of financial events.
 * Accepts an array of StockNewsEvent objects in the body.
 */
financialEventsCronRouter.post("/financial-events", async (c) => {
  try {
    const { events } = await c.req.json();

    if (!Array.isArray(events)) {
      return c.json({ error: "events must be an array" }, 400);
    }

    for (const event of events) {
      start(processFinancialEventWorkflow, [event]);
    }

    return c.json({
      eventsDispatched: events.length,
      success: true,
    });
  } catch (error) {
    console.error("Failed to dispatch financial events:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      500
    );
  }
});

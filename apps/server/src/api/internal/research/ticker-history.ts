import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getHistoricalRange,
  tickerHistoryQuerySchema,
  tickerHistoryResponseSchema,
} from "@cobalt-web/server-data/research/ticker-history";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

function shiftDate(iso: string, days: number): string {
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/ticker-history",
  request: { query: tickerHistoryQuerySchema },
  responses: {
    200: jsonContent(tickerHistoryResponseSchema, "Daily closes around the requested date"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    422: validationErrorResponse(tickerHistoryQuerySchema),
    502: jsonContent(errorResponseWithCodeSchema, "FMP upstream failed"),
  },
  summary: "Get daily closes around a date (cost-basis picker)",
  tags: ["Research"],
});

export const tickerHistoryRouter = createApp().openapi(route, async (c) => {
  const { symbol, date, window } = c.req.valid("query");
  const w = window ?? 7;
  const from = shiftDate(date, -w);
  const to = shiftDate(date, w);
  const points = await getHistoricalRange(symbol, from, to);
  c.header("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
  return c.json(
    tickerHistoryResponseSchema.parse({
      points: points.map((p) => ({ close: p.close, date: p.date, high: p.high, low: p.low })),
      requested: date,
      symbol,
    }),
    200,
  );
});

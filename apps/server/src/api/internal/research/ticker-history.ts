import { fmpGetHistoricalRange } from "@cobalt-web/server-data/research/fmp-ticker";
import {
  errorResponseSchema,
  tickerHistoryQuerySchema,
  tickerHistoryResponseSchema,
} from "@cobalt-web/server-data/research/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/ticker-history",
  request: { query: tickerHistoryQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: tickerHistoryResponseSchema } },
      description: "Daily closes around the requested date",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get daily closes around a date (cost-basis picker)",
  tags: ["Research"],
});

function shiftDate(iso: string, days: number): string {
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export const tickerHistoryRouter = new OpenAPIHono<AppEnv>().openapi(route, async (c) => {
  try {
    const { symbol, date, window } = c.req.valid("query");
    const w = window ?? 7;
    const from = shiftDate(date, -w);
    const to = shiftDate(date, w);
    const points = await fmpGetHistoricalRange(symbol, from, to);
    c.header("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=3600");
    return c.json(
      {
        points: points.map((p) => ({ close: p.close, date: p.date })),
        requested: date,
        symbol,
      },
      200,
    );
  } catch {
    return c.json({ error: "Failed to fetch ticker history" }, 500);
  }
});

import { fmpGetChart } from "@cobalt-web/server-data/research/fmp-ticker";
import type { TimePeriod } from "@cobalt-web/server-data/research/fmp-ticker";
import { chartQuerySchema, chartResponseSchema } from "@cobalt-web/server-data/research/schemas";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/chart",
  request: { query: chartQuerySchema },
  responses: {
    200: jsonContent(chartResponseSchema, "Chart data"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Ticker not found"),
    422: validationErrorResponse(chartQuerySchema),
    502: jsonContent(errorResponseWithCodeSchema, "FMP upstream failed"),
  },
  summary: "Get price chart data",
  tags: ["Research"],
});

export const chartRouter = createApp().openapi(route, async (c) => {
  const { symbol, timePeriod } = c.req.valid("query");
  const period = (timePeriod ?? "1M") as TimePeriod;
  const points = await fmpGetChart(symbol, period);

  const data = points.map((p, i) => ({
    close: p.close,
    high: p.high,
    id: p.date || `chart-${i}`,
    low: p.low,
    open: p.open,
    price: p.close,
    time: p.date,
    volume: p.volume,
  }));

  const isIntraday = period === "1D" || period === "1W";
  const cacheSeconds = isIntraday ? 900 : 86_400;
  c.header("Cache-Control", `public, s-maxage=${cacheSeconds}, stale-while-revalidate=3600`);
  return c.json({ data }, 200);
});

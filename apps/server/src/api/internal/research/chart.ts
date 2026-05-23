import {
  chartQuerySchema,
  chartResponseSchema,
  getChart,
} from "@cobalt-web/server-data/research/chart";
import type { TimePeriod } from "@cobalt-web/server-data/research/chart";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

// FMP returns daily as "YYYY-MM-DD" and intraday as "YYYY-MM-DD HH:mm:ss" in
// America/New_York. Normalize to RFC3339 UTC so strict ISO8601 parsers
// (e.g. iOS ISO8601DateFormatter) accept every point.
const ET_TZ = "America/New_York";

function etOffsetHours(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TZ,
    timeZoneName: "shortOffset",
  }).formatToParts(at);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  const match = tzName.match(/GMT([+-]\d+)(?::(\d+))?/);
  const hoursStr = match?.[1];
  if (!hoursStr) {
    return -5;
  }
  const hours = Number.parseInt(hoursStr, 10);
  const minutesStr = match?.[2];
  const minutes = minutesStr ? Number.parseInt(minutesStr, 10) : 0;
  return hours + (hours < 0 ? -minutes / 60 : minutes / 60);
}

function normalizeChartTime(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T00:00:00.000Z`;
  }
  const m = raw.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/);
  const datePart = m?.[1];
  const timePart = m?.[2];
  if (datePart && timePart) {
    const probe = new Date(`${datePart}T${timePart}Z`);
    if (!Number.isNaN(probe.getTime())) {
      const offset = etOffsetHours(probe);
      const utc = new Date(probe.getTime() - offset * 3600 * 1000);
      return utc.toISOString();
    }
  }
  return raw;
}

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
  const points = await getChart(symbol, period);

  const data = points.map((p, i) => ({
    close: p.close,
    high: p.high,
    id: p.date || `chart-${i}`,
    low: p.low,
    open: p.open,
    price: p.close,
    time: normalizeChartTime(p.date),
    volume: p.volume,
  }));

  const isIntraday = period === "1D" || period === "1W";
  const cacheSeconds = isIntraday ? 900 : 86_400;
  c.header("Cache-Control", `public, s-maxage=${cacheSeconds}, stale-while-revalidate=3600`);
  return c.json(chartResponseSchema.parse({ data }), 200);
});

import { fmpGetChart } from "@cobalt-web/server-data/research/fmp-ticker";
import type { TimePeriod } from "@cobalt-web/server-data/research/lib";
import {
  chartQuerySchema,
  chartResponseSchema,
  errorResponseSchema,
} from "@cobalt-web/server-data/research/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "get",
  path: "/chart",
  request: { query: chartQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: chartResponseSchema } },
      description: "Chart data",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get price chart data",
  tags: ["Research"],
});

export const chartRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
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
      c.header(
        "Cache-Control",
        `public, s-maxage=${cacheSeconds}, stale-while-revalidate=3600`
      );
      return c.json({ data }, 200);
    } catch {
      return c.json({ error: "Failed to fetch chart data" }, 500);
    }
  }
);

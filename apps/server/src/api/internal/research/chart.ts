import {
  filterChartData,
  getIntervalForTimePeriod,
  processDailyData,
  processIntradayData,
} from "@cobalt-web/server-data/research/lib";
import type { TimePeriod } from "@cobalt-web/server-data/research/lib";
import {
  getIntradayData,
  getTimeSeriesData,
} from "@cobalt-web/server-data/research/queries";
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
      const {
        symbol,
        timePeriod,
        interval: legacyInterval,
      } = c.req.valid("query");

      let interval: "1min" | "60min" | "daily";
      let outputsize: "compact" | "full";
      let shouldFilter = false;

      if (timePeriod) {
        interval = getIntervalForTimePeriod(timePeriod as TimePeriod);
        shouldFilter = true;
        switch (timePeriod) {
          case "1D":
          case "1W": {
            outputsize = "full";
            break;
          }
          case "1M":
          case "3M": {
            outputsize = "compact";
            break;
          }
          default: {
            outputsize = "full";
          }
        }
      } else if (legacyInterval) {
        if (legacyInterval === "1min") {
          interval = "1min";
        } else if (legacyInterval === "60min") {
          interval = "60min";
        } else {
          interval = "daily";
        }
        outputsize = "full";
      } else {
        interval = "1min";
        outputsize = "compact";
      }

      let processedData;

      if (interval === "daily") {
        const response = await getTimeSeriesData({
          interval: "daily",
          outputsize,
          symbol,
        });
        processedData = processDailyData(response as never);
      } else {
        const intervalValue = interval === "1min" ? "1min" : "60min";
        const response = await getIntradayData({
          extended_hours: false,
          interval: intervalValue,
          outputsize,
          symbol,
        });
        const intervalKey =
          intervalValue === "1min"
            ? "Time Series (1min)"
            : "Time Series (60min)";
        processedData = processIntradayData(response as never, intervalKey);
      }

      if (shouldFilter && timePeriod) {
        processedData = filterChartData(
          processedData,
          timePeriod as TimePeriod
        );
      }

      const dataWithIds = processedData.map((item, index) => ({
        ...item,
        id: item.time || `chart-${index}`,
      }));

      const cacheSeconds = interval === "daily" ? 86_400 : 900;
      c.header(
        "Cache-Control",
        `public, s-maxage=${cacheSeconds}, stale-while-revalidate=3600`
      );
      return c.json({ data: dataWithIds }, 200);
    } catch {
      return c.json({ error: "Failed to fetch chart data" }, 500);
    }
  }
);

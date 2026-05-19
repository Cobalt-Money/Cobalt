import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react";
import { z } from "zod";

export const chartCatalog = defineCatalog(schema, {
  actions: {},
  components: {
    AreaChart: {
      description:
        "An area chart for cumulative or stacked data over time. Use for showing totals, accumulations, or multiple series with filled areas.",
      props: z.object({
        data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
        description: z.string().optional(),
        height: z.number().optional().default(380),
        title: z.string().optional(),
        xKey: z.string().describe("Key in data objects for X-axis (e.g., 'date', 'period')"),
        yKeys: z
          .array(z.string())
          .describe("Keys in data objects for Y-axis areas (e.g., ['value', 'total'])"),
      }),
    },
    BarChart: {
      description:
        "A bar chart for categorical or discrete data. Use for comparing values across categories, months, or groups.",
      props: z.object({
        data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
        description: z.string().optional(),
        height: z.number().optional().default(380),
        title: z.string().optional(),
        xKey: z.string().describe("Key in data objects for X-axis (e.g., 'category', 'month')"),
        yKeys: z
          .array(z.string())
          .describe("Keys in data objects for Y-axis bars (e.g., ['amount', 'count'])"),
      }),
    },
    LineChart: {
      description:
        "A line chart for time series or sequential data. Use for trends over time, comparisons, or continuous data.",
      props: z.object({
        data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
        description: z.string().optional(),
        height: z.number().optional().default(380),
        title: z.string().optional(),
        xKey: z.string().describe("Key in data objects for X-axis (e.g., 'date', 'label')"),
        yKeys: z
          .array(z.string())
          .describe("Keys in data objects for Y-axis lines (e.g., ['value', 'revenue'])"),
      }),
    },
    PieChart: {
      description:
        "A pie chart for showing proportions or percentages. Use for part-to-whole relationships, category breakdowns, or distributions.",
      props: z.object({
        data: z.array(
          z.object({
            label: z.string(),
            value: z.number(),
          }),
        ),
        dataKey: z.string().default("value").describe("Key for slice values"),
        description: z.string().optional(),
        height: z.number().optional().default(380),
        nameKey: z.string().default("label").describe("Key for slice labels"),
        title: z.string().optional(),
      }),
    },
  },
});

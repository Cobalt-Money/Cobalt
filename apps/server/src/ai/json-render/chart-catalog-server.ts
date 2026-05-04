import { defineCatalog, defineSchema } from "@json-render/core";
import { z } from "zod";

const chartSchema = defineSchema((s) => ({
  catalog: s.object({
    actions: s.map({
      description: s.string(),
      params: s.zod(),
    }),
    components: s.map({
      description: s.string(),
      props: s.zod(),
    }),
  }),
  spec: s.object({
    elements: s.record(
      s.object({
        children: s.array(s.string()),
        props: s.propsOf("catalog.components"),
        type: s.ref("catalog.components"),
        visible: s.any(),
      }),
    ),
    root: s.string(),
  }),
}));

const chartComponentProps = {
  AreaChart: z.object({
    data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
    description: z.string().optional(),
    height: z.number().optional().default(380),
    title: z.string().optional(),
    xKey: z.string(),
    yKeys: z.array(z.string()),
  }),
  BarChart: z.object({
    data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
    description: z.string().optional(),
    height: z.number().optional().default(380),
    title: z.string().optional(),
    xKey: z.string(),
    yKeys: z.array(z.string()),
  }),
  LineChart: z.object({
    data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
    description: z.string().optional(),
    height: z.number().optional().default(380),
    title: z.string().optional(),
    xKey: z.string(),
    yKeys: z.array(z.string()),
  }),
  PieChart: z.object({
    data: z.array(z.object({ label: z.string(), value: z.number() })),
    dataKey: z.string().default("value"),
    description: z.string().optional(),
    height: z.number().optional().default(380),
    nameKey: z.string().default("label"),
    title: z.string().optional(),
  }),
};

export const chartCatalogServer = defineCatalog(chartSchema, {
  actions: {},
  components: {
    AreaChart: {
      description:
        "An area chart for cumulative or stacked data over time. Use for showing totals, accumulations, or multiple series with filled areas.",
      props: chartComponentProps.AreaChart,
    },
    BarChart: {
      description:
        "A bar chart for categorical or discrete data. Use for comparing values across categories, months, or groups.",
      props: chartComponentProps.BarChart,
    },
    LineChart: {
      description:
        "A line chart for time series or sequential data. Use for trends over time, comparisons, or continuous data.",
      props: chartComponentProps.LineChart,
    },
    PieChart: {
      description:
        "A pie chart for showing proportions or percentages. Use for part-to-whole relationships, category breakdowns, or distributions.",
      props: chartComponentProps.PieChart,
    },
  },
});

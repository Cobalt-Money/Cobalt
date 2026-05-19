import { tool } from "ai";
import type { UIToolInvocation } from "ai";
import { z } from "zod";

export const renderChartTool = tool({
  description:
    "Render a chart or visualization. Use this after fetching data to create visualizations. The spec should use one of the available chart components: LineChart, BarChart, PieChart, or AreaChart. Compose the chart spec based on the data you've already fetched from other tools.",
  execute: ({ spec }) => spec,
  inputSchema: z.object({
    spec: z.object({
      elements: z
        .record(
          z.string(),
          z.object({
            children: z.array(z.string()).default([]).describe("Child element keys"),
            props: z
              .record(z.string(), z.unknown())
              .describe("Chart component props (data, xKey, yKeys, title, etc.)"),
            type: z
              .enum(["LineChart", "BarChart", "PieChart", "AreaChart"])
              .describe("Chart component type"),
            visible: z.any().optional().describe("Visibility condition (optional)"),
          }),
        )
        .describe("Map of element keys to element definitions"),
      root: z.string().describe("Root element key (e.g., 'chart-1')"),
    }),
  }),
});

export type RenderChartToolInvocation = UIToolInvocation<typeof renderChartTool>;

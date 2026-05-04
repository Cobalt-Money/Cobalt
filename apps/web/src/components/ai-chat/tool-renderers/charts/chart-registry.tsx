import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cobalt-web/ui/components/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@cobalt-web/ui/components/chart";
import type { ChartConfig } from "@cobalt-web/ui/components/chart";
import { defineRegistry } from "@json-render/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { chartCatalog } from "./chart-catalog";

function formatDateTick(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
  }
  return String(value);
}

export const { registry: chartRegistry } = defineRegistry(chartCatalog, {
  actions: {},
  components: {
    AreaChart: ({ props }) => {
      const {
        title,
        description,
        data,
        xKey,
        yKeys,
        height = 380,
      } = props as {
        title?: string;
        description?: string;
        data: Record<string, unknown>[];
        xKey: string;
        yKeys: string[];
        height?: number;
      };

      const chartConfig: ChartConfig = {};
      for (const [index, key] of yKeys.entries()) {
        chartConfig[key] = {
          color: `var(--chart-${(index % 5) + 1})`,
          label: key,
        };
      }

      return (
        <Card>
          {(title ?? description) && (
            <CardHeader>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
          )}
          <CardContent>
            <ChartContainer
              className="w-full"
              config={chartConfig}
              style={{ height: `${height}px` }}
            >
              <AreaChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <YAxis hide />
                <XAxis
                  axisLine={false}
                  dataKey={xKey}
                  minTickGap={32}
                  tickFormatter={formatDateTick}
                  tickLine={false}
                  tickMargin={8}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {yKeys.map((key, index) => (
                  <Area
                    key={key}
                    activeDot={{ r: 4, strokeWidth: 1 }}
                    dataKey={key}
                    dot={false}
                    fill={`var(--chart-${(index % 5) + 1})`}
                    fillOpacity={0.2}
                    stroke={`var(--chart-${(index % 5) + 1})`}
                    strokeWidth={2}
                    type="monotone"
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      );
    },

    BarChart: ({ props }) => {
      const {
        title,
        description,
        data,
        xKey,
        yKeys,
        height = 380,
      } = props as {
        title?: string;
        description?: string;
        data: Record<string, unknown>[];
        xKey: string;
        yKeys: string[];
        height?: number;
      };

      const chartConfig: ChartConfig = {};
      for (const [index, key] of yKeys.entries()) {
        chartConfig[key] = {
          color: `var(--chart-${(index % 5) + 1})`,
          label: key,
        };
      }

      return (
        <Card>
          {(title ?? description) && (
            <CardHeader>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
          )}
          <CardContent>
            <ChartContainer
              className="w-full"
              config={chartConfig}
              style={{ height: `${height}px` }}
            >
              <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey={xKey}
                  minTickGap={32}
                  tickFormatter={formatDateTick}
                  tickLine={false}
                  tickMargin={8}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {yKeys.map((key, index) => (
                  <Bar key={key} dataKey={key} fill={`var(--chart-${(index % 5) + 1})`} />
                ))}
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      );
    },

    LineChart: ({ props }) => {
      const {
        title,
        description,
        data,
        xKey,
        yKeys,
        height = 380,
      } = props as {
        title?: string;
        description?: string;
        data: Record<string, unknown>[];
        xKey: string;
        yKeys: string[];
        height?: number;
      };

      const chartConfig: ChartConfig = {};
      for (const [index, key] of yKeys.entries()) {
        chartConfig[key] = {
          color: `var(--chart-${(index % 5) + 1})`,
          label: key,
        };
      }

      return (
        <Card>
          {(title ?? description) && (
            <CardHeader>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
          )}
          <CardContent>
            <ChartContainer
              className="w-full"
              config={chartConfig}
              style={{ height: `${height}px` }}
            >
              <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <YAxis hide />
                <XAxis
                  axisLine={false}
                  dataKey={xKey}
                  minTickGap={32}
                  tickFormatter={formatDateTick}
                  tickLine={false}
                  tickMargin={8}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {yKeys.map((key, index) => (
                  <Line
                    key={key}
                    activeDot={{ r: 4, strokeWidth: 1 }}
                    dataKey={key}
                    dot={false}
                    stroke={`var(--chart-${(index % 5) + 1})`}
                    strokeWidth={2}
                    type="monotone"
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      );
    },

    PieChart: ({ props }) => {
      const {
        title,
        description,
        data,
        nameKey = "label",
        dataKey = "value",
        height = 380,
      } = props as {
        title?: string;
        description?: string;
        data: Record<string, unknown>[];
        nameKey?: string;
        dataKey?: string;
        height?: number;
      };

      const chartConfig: ChartConfig = {
        [dataKey]: { label: "Value" },
      };

      const chartData = data.map((item, index) => ({
        ...item,
        fill: `var(--chart-${(index % 5) + 1})`,
      }));

      return (
        <Card>
          {(title ?? description) && (
            <CardHeader>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
          )}
          <CardContent>
            <ChartContainer
              className="mx-auto aspect-square"
              config={chartConfig}
              style={{ maxHeight: `${height}px` }}
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={chartData} dataKey={dataKey} label nameKey={nameKey} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      );
    },
  },
});

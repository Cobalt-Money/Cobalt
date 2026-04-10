import { Button } from "@cobalt-web/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@cobalt-web/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@cobalt-web/ui/components/tabs";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_PERIODS = [
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "YTD",
  "1Y",
  "All",
] as const;

export type ChartPeriod = (typeof CHART_PERIODS)[number];

interface ChartRow {
  i: number;
  label: string;
  price: number;
  volume: number;
}

export function TickerDetailPriceChart({
  chartGradientId,
  chartPoints,
  chartStroke,
  period,
  setPeriod,
}: {
  chartGradientId: string;
  chartPoints: ChartRow[];
  chartStroke: string;
  period: ChartPeriod;
  setPeriod: (p: ChartPeriod) => void;
}) {
  return (
    <Card className="border-border/60 bg-card/40 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Price</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="min-h-[220px] w-full min-w-0">
          {chartPoints.length === 0 ? (
            <p className="text-muted-foreground text-sm">No chart data.</p>
          ) : (
            <ResponsiveContainer height={220} width="100%">
              <AreaChart
                data={chartPoints}
                margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
              >
                <defs>
                  <linearGradient
                    id={chartGradientId}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={chartStroke} stopOpacity={0} />
                    <stop
                      offset="100%"
                      stopColor={chartStroke}
                      stopOpacity={0.35}
                    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="i" hide type="number" />
                <YAxis domain={["auto", "auto"]} hide width={0} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid oklch(0.5 0.02 280 / 0.25)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(v: unknown) => [
                    typeof v === "number"
                      ? v.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                          minimumFractionDigits: 2,
                        })
                      : "—",
                    "Price",
                  ]}
                  labelFormatter={(_, payload) => {
                    const p = payload[0]?.payload as { label?: string };
                    return p?.label ?? "";
                  }}
                />
                <Area
                  dataKey="price"
                  fill={`url(#${chartGradientId})`}
                  isAnimationActive={false}
                  stroke={chartStroke}
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div
          aria-label="Chart time range"
          className="flex flex-wrap gap-1"
          role="toolbar"
        >
          {CHART_PERIODS.map((p) => (
            <Button
              aria-pressed={period === p}
              className="h-8 px-2 text-xs"
              key={p}
              onClick={() => setPeriod(p)}
              size="sm"
              type="button"
              variant={period === p ? "secondary" : "ghost"}
            >
              {p}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function newsTitle(item: Record<string, unknown>): string {
  for (const k of ["title", "headline", "text"]) {
    const v = item[k];
    if (typeof v === "string" && v.trim()) {
      return v.trim();
    }
  }
  return "Article";
}

function newsHref(item: Record<string, unknown>): string | null {
  const v = item.url ?? item.link ?? item.news_url;
  return typeof v === "string" && v.startsWith("http") ? v : null;
}

function newsItemKey(item: Record<string, unknown>, title: string): string {
  const id = item.id ?? item.news_id ?? item.article_id;
  if (typeof id === "string" || typeof id === "number") {
    return String(id);
  }
  const href = newsHref(item);
  const pub = item.date ?? item.publishedDate ?? item.published_at;
  const pubStr = typeof pub === "string" ? pub : "";
  return `${title}|${pubStr}|${href ?? ""}`;
}

export function TickerDetailNewsTabs({
  description,
  news,
}: {
  description: string;
  news: Record<string, unknown>[];
}) {
  return (
    <Tabs className="w-full min-w-0" defaultValue="news">
      <TabsList>
        <TabsTrigger value="news">News</TabsTrigger>
        <TabsTrigger value="about">About</TabsTrigger>
      </TabsList>
      <TabsContent className="mt-3 min-w-0" value="news">
        <ul className="space-y-3">
          {news.slice(0, 12).map((item) => {
            const title = newsTitle(item);
            const href = newsHref(item);
            return (
              <li key={newsItemKey(item, title)}>
                {href ? (
                  <a
                    className="text-foreground text-sm underline-offset-4 hover:underline"
                    href={href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {title}
                  </a>
                ) : (
                  <span className="text-sm">{title}</span>
                )}
              </li>
            );
          })}
          {news.length === 0 ? (
            <li className="text-muted-foreground text-sm">No news.</li>
          ) : null}
        </ul>
      </TabsContent>
      <TabsContent className="mt-3" value="about">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description || "No company description available."}
        </p>
      </TabsContent>
    </Tabs>
  );
}

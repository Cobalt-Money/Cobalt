"use client";

import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { Button } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const CHART_RANGES = ["1D", "1W", "1M", "3M", "YTD", "1Y", "5Y"] as const;
type ChartRange = (typeof CHART_RANGES)[number];

export interface BabyTickerDetailData {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  pctChange1d: number;
  pctChangeYtd: number;
  marketCap: number;
  peRatio: number;
  volume?: number;
}

function formatMarketCap(n: number): string {
  if (n >= 1e12) {
    return `$${(n / 1e12).toFixed(2)}T`;
  }
  if (n >= 1e9) {
    return `$${(n / 1e9).toFixed(2)}B`;
  }
  if (n >= 1e6) {
    return `$${(n / 1e6).toFixed(2)}M`;
  }
  return `$${n.toLocaleString()}`;
}

function formatVolume(n: number | undefined): string {
  if (!n) {
    return "—";
  }
  if (n >= 1e9) {
    return `${(n / 1e9).toFixed(2)}B`;
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toFixed(2)}M`;
  }
  if (n >= 1e3) {
    return `${(n / 1e3).toFixed(1)}K`;
  }
  return n.toLocaleString();
}

/** Deterministic pseudo-random from a string seed so each symbol gets a stable chart. */
function seededRandom(seed: string): () => number {
  let state = 1;
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 31 + (seed.codePointAt(i) ?? 0)) % 2_147_483_647;
  }
  if (state <= 0) {
    state = 1;
  }
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_647;
    return state / 2_147_483_647;
  };
}

function buildSeries(
  symbol: string,
  endPrice: number,
  pctChange: number,
  points: number,
): { i: number; v: number }[] {
  const rand = seededRandom(`${symbol}-${points}`);
  const startPrice = endPrice / (1 + pctChange / 100);
  const series: { i: number; v: number }[] = [];
  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    const trend = startPrice + (endPrice - startPrice) * t;
    const noise = (rand() - 0.5) * endPrice * 0.04;
    series.push({ i, v: Math.max(0.01, trend + noise) });
  }
  series[series.length - 1] = { i: points - 1, v: endPrice };
  return series;
}

const COMPANY_BLURBS: Record<string, string> = {
  AAPL: "Apple designs consumer hardware — iPhone, Mac, iPad, Watch — and an attached services business spanning the App Store, iCloud, Apple Pay, and media. Services has steadily grown as a share of revenue and operating profit.",
  ACN: "Accenture is a global professional-services firm providing consulting, managed services, and technology integration across industries.",
  AMD: "Advanced Micro Devices designs x86 CPUs (Ryzen, EPYC), GPUs (Radeon, Instinct), and adaptive computing platforms following the Xilinx acquisition.",
  AMZN: "Amazon operates the largest e-commerce marketplace in North America, a global advertising business, and AWS — the cloud platform that supplies the majority of the company's operating income.",
  AVGO: "Broadcom designs semiconductors for networking, storage, and wireless applications, and — following the VMware acquisition — operates a large enterprise-infrastructure software business.",
  BRK: "Berkshire Hathaway is a holding company with wholly-owned businesses across insurance, rail (BNSF), energy, manufacturing, and retail, plus a large public-equity portfolio.",
  CDNS: "Cadence Design Systems provides EDA software, simulation, and IP used by semiconductor and systems companies to design and verify complex chips.",
  CRM: "Salesforce is the market-leading enterprise CRM platform, with an expanding portfolio spanning data (Data Cloud), analytics (Tableau), automation (MuleSoft), and collaboration (Slack).",
  CSCO: "Cisco Systems supplies networking hardware, security, and collaboration software to enterprises. The Splunk acquisition expanded its observability and security-analytics footprint.",
  GOOGL:
    "Alphabet is the holding company for Google, covering Search, YouTube, Android, Google Cloud, and a portfolio of Other Bets. Advertising remains the dominant revenue line, with Cloud as the fastest-growing segment.",
  GS: "Goldman Sachs is a leading global investment bank with businesses in M&A advisory, capital markets, asset and wealth management, and a smaller consumer-banking footprint.",
  INTC: "Intel designs and manufactures x86 CPUs, GPUs, and foundry services. The company is in a multi-year turnaround focused on process-node leadership and external foundry customers.",
  JNJ: "Johnson & Johnson is a diversified healthcare company with businesses in pharmaceuticals and medical devices following the 2023 spin-off of its consumer-health segment (Kenvue).",
  JPM: "JPMorgan Chase is a universal bank with leading positions in consumer banking, investment banking, asset management, and global markets. It is the largest U.S. bank by assets.",
  LLY: "Eli Lilly develops and markets pharmaceuticals across diabetes, oncology, immunology, and neuroscience. The GLP-1 franchise (Mounjaro, Zepbound) has become a major revenue driver.",
  MA: "Mastercard operates a global payments network, connecting banks, merchants, and cardholders across 210+ countries and territories. Revenue is driven primarily by transaction volume and cross-border activity.",
  META: "Meta Platforms runs Facebook, Instagram, WhatsApp, and Threads, monetizing through advertising. The Reality Labs segment invests in AR/VR hardware and Horizon, the company's metaverse platform.",
  MSFT: "Microsoft operates cloud infrastructure (Azure), productivity software (Microsoft 365), gaming (Xbox, Activision), and an expanding portfolio of AI products built on its OpenAI partnership.",
  NOW: "ServiceNow is an enterprise software company whose platform powers IT service management, HR, customer service, and increasingly AI-driven workflows.",
  NVDA: "NVIDIA designs graphics processors, AI accelerators, and the CUDA software stack that powers them. The data-center business has grown into the dominant driver of revenue as hyperscalers and AI labs build out GPU capacity.",
  PLTR: "Palantir builds data-integration and analytics platforms — Gotham for government, Foundry for commercial — and, more recently, AIP, its generative-AI operating layer.",
  SNPS: "Synopsys is a leading provider of electronic design automation (EDA) software and semiconductor IP used by chip designers across the industry. Pending acquisition of Ansys broadens its simulation portfolio.",
  TSLA: "Tesla designs and manufactures electric vehicles and energy storage products. The company also sells regulatory credits, operates a supercharging network, and is developing autonomy and humanoid-robotics programs.",
  V: "Visa operates the world's largest retail electronic-payments network, earning fees on transaction volume across credit, debit, and prepaid rails in more than 200 countries.",
  XLK: "The Technology Select Sector SPDR Fund is a passive ETF holding the technology constituents of the S&P 500, weighted by market capitalization.",
};

function companyBlurb(symbol: string): string {
  const root = symbol.split(".")[0] ?? symbol;
  return (
    COMPANY_BLURBS[symbol] ??
    COMPANY_BLURBS[root] ??
    `${symbol} is a publicly traded company. Full fundamentals, filings, and peer comparisons are available in the connected data providers in the live Cobalt app.`
  );
}

export function BabyTickerDetail({ data }: { data: BabyTickerDetailData }) {
  const [range, setRange] = useState<ChartRange>("1M");

  const series = useMemo(
    () =>
      buildSeries(
        data.symbol,
        data.price,
        range === "YTD" || range === "1Y" || range === "5Y" ? data.pctChangeYtd : data.pctChange1d,
        range === "1D" ? 48 : 64,
      ),
    [data.symbol, data.price, data.pctChange1d, data.pctChangeYtd, range],
  );

  const change1dAbs = data.price - data.price / (1 + data.pctChange1d / 100);
  const isUp = data.pctChange1d >= 0;
  const tone = isUp ? "text-green-550" : "text-red-600 dark:text-red-400";
  const lineColor = isUp ? "var(--color-green-550)" : "#dc2626";
  const gradientId = `babyTickerFill-${data.symbol}`;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-6 px-6 pb-8 pt-4">
      <header className="flex items-center gap-3">
        <TickerLogo size={40} symbol={data.symbol} />
        <div className="flex min-w-0 flex-col">
          <h1 className="text-left text-2xl font-semibold leading-tight tracking-tight text-foreground">
            {data.symbol}
          </h1>
          <p className="truncate text-left text-sm text-muted-foreground">
            {data.name} · {data.sector}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-left font-semibold text-3xl tabular-nums tracking-tight">
            ${data.price.toFixed(2)}
          </p>
          <p className={cn("text-left text-sm tabular-nums", tone)}>
            {change1dAbs >= 0 ? "+" : ""}
            {change1dAbs.toFixed(2)} ({isUp ? "+" : ""}
            {data.pctChange1d.toFixed(2)}%)
          </p>
        </div>
        <div
          aria-label="Chart time range"
          className="flex min-h-8 flex-wrap items-center gap-1"
          role="toolbar"
        >
          {CHART_RANGES.map((r) => {
            const selected = range === r;
            return (
              <Button
                className={cn("h-7 px-2 text-xs", selected && "bg-muted text-foreground")}
                key={r}
                onClick={() => setRange(r)}
                size="sm"
                type="button"
                variant="ghost"
              >
                {r}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={series} margin={{ bottom: 0, left: 0, right: 0, top: 4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" hide />
            <YAxis axisLine={false} domain={["dataMin", "dataMax"]} hide tickLine={false} />
            <Area
              dataKey="v"
              fill={`url(#${gradientId})`}
              stroke={lineColor}
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-left text-sm font-medium text-muted-foreground">Key stats</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Stat label="Market cap" value={formatMarketCap(data.marketCap)} />
          <Stat label="P/E ratio" value={data.peRatio.toFixed(2)} />
          <Stat label="Volume" value={formatVolume(data.volume)} />
          <Stat
            label="1D change"
            value={`${isUp ? "+" : ""}${data.pctChange1d.toFixed(2)}%`}
            tone={tone}
          />
          <Stat
            label="YTD change"
            value={`${data.pctChangeYtd >= 0 ? "+" : ""}${data.pctChangeYtd.toFixed(2)}%`}
            tone={data.pctChangeYtd >= 0 ? "text-green-550" : "text-red-600 dark:text-red-400"}
          />
          <Stat label="Sector" value={data.sector} />
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-left text-sm font-medium text-muted-foreground">About {data.name}</h2>
        <p className="text-left text-sm leading-relaxed text-foreground">
          {companyBlurb(data.symbol)}
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-left text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-left text-sm font-medium tabular-nums text-foreground", tone)}>
        {value}
      </dd>
    </div>
  );
}

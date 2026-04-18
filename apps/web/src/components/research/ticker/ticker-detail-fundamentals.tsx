import { useQuery } from "@tanstack/react-query";

import { TickerDetailAbout } from "@/components/research/ticker/ticker-detail-sections";
import { TickerKeyMetrics } from "@/components/research/ticker/ticker-key-metrics";
import type { KeyMetricRow } from "@/components/research/ticker/ticker-key-metrics";
import type { FmpProfile } from "@/hooks/research-queries";
import { tickerOverview } from "@/hooks/research-queries";

function formatMarketCap(n: number): string {
  if (n >= 1e12) {
    return `${(n / 1e12).toFixed(2)}T`;
  }
  if (n >= 1e9) {
    return `${(n / 1e9).toFixed(2)}B`;
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toFixed(2)}M`;
  }
  return n.toLocaleString();
}

function fmtNum(n: number | null, decimals = 2): string {
  if (n === null) {
    return "—";
  }
  return n.toFixed(decimals);
}

/** `href` for `<a>`; `label` = hostname for display (falls back to trimmed raw if parsing fails). */
function websiteDisplay(raw: string | null | undefined): {
  href: string;
  label: string;
} {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) {
    return { href: "", label: "" };
  }
  const href = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const host = new URL(href).hostname.replace(/^www\./i, "");
    return { href, label: host || t };
  } catch {
    return { href, label: t };
  }
}

function toKeyMetrics(overview: FmpProfile | undefined): KeyMetricRow[] {
  if (!overview) {
    return [];
  }

  const cap = overview.marketCap;
  const { pe } = overview;
  const { revenue } = overview;
  const site = websiteDisplay(overview.website);

  return [
    {
      label: "Market cap",
      value: cap === null ? "—" : formatMarketCap(cap),
    },
    { label: "P/E", value: fmtNum(pe) },
    {
      label: "Revenue",
      value: revenue === null ? "—" : formatMarketCap(revenue),
    },
    { label: "Sector", value: overview.sector ?? "—" },
    { label: "Industry", value: overview.industry ?? "—" },
    { label: "Country", value: overview.country ?? "—" },
    { label: "CEO", value: overview.ceo ?? "—" },
    {
      label: "Website",
      value: site.label || "—",
      ...(site.href ? { href: site.href } : {}),
    },
  ];
}

export function TickerDetailFundamentals({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase();

  const { data: overview } = useQuery(tickerOverview(sym));

  const keyMetrics = toKeyMetrics(overview);
  const description = overview?.description?.trim() ?? "";

  return (
    <div className="flex flex-col gap-8">
      <TickerKeyMetrics rows={keyMetrics} />
      <TickerDetailAbout description={description} />
    </div>
  );
}

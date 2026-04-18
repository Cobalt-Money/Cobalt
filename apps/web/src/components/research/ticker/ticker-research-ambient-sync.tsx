import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { useAmbientInset } from "@/components/shell/ambient-inset-context";
import { tickerOverview } from "@/hooks/research-queries";
import type { TickerQuote } from "@/hooks/research-queries";

/**
 * Syncs research header / ambient inset with company name from quote + overview.
 * Owns the overview query for this purpose (deduped with {@link TickerDetailFundamentals}).
 */
export function TickerResearchAmbientSync({
  quote,
  symbol,
}: {
  quote: TickerQuote | undefined;
  symbol: string;
}) {
  const sym = symbol.trim().toUpperCase();
  const { setResearchTicker } = useAmbientInset();

  const { data: overview } = useQuery(tickerOverview(sym));

  const companyName = useMemo(() => {
    if (quote?.companyName) {
      return quote.companyName;
    }
    return overview?.companyName ?? null;
  }, [quote?.companyName, overview]);

  useEffect(() => {
    setResearchTicker(sym, companyName);
    return () => {
      setResearchTicker(null);
    };
  }, [companyName, setResearchTicker, sym]);

  return null;
}

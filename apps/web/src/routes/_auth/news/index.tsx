import { NewsMagazine } from "@cobalt-web/ui/cobalt/news/news-magazine";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { useBrokerage } from "@/hooks/use-brokerage";
import { useFinancialEvents } from "@/hooks/use-financial-events";
import { useNewsRssSidebar } from "@/hooks/use-news-rss";

export const Route = createFileRoute("/_auth/news/")({
  component: NewsIndexPage,
  staticData: { title: "News" },
});

function NewsIndexPage() {
  const { events } = useFinancialEvents();
  const { items: rssItems } = useNewsRssSidebar();
  const { positions } = useBrokerage();

  const holdingSymbols = useMemo(() => {
    const s = new Set<string>();
    for (const p of positions) {
      const raw = p.symbol;
      const sym = typeof raw === "string" ? raw.trim().toUpperCase() : "";
      if (sym) {
        s.add(sym);
      }
    }
    return s;
  }, [positions]);

  const eventsForYou = useMemo(() => {
    if (holdingSymbols.size === 0) {
      return [];
    }
    return events.filter((e) =>
      e.tickers.some((t) => holdingSymbols.has(String(t).trim().toUpperCase()))
    );
  }, [events, holdingSymbols]);

  return (
    <NewsMagazine
      eventsGeneral={events}
      eventsForYou={eventsForYou}
      rssItems={rssItems}
    />
  );
}

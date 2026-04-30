import { NewsMagazine } from "@cobalt-web/ui/cobalt/news/news-magazine";
import { queries } from "@cobalt-web/zero";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { Link } from "@/components/links";
import { useCommandMenu } from "@/components/shell/command-menu";
import { useBrokerage } from "@/hooks/use-brokerage";
import { useFinancialEvents } from "@/hooks/use-financial-events";
import { useNewsRssSidebar } from "@/hooks/use-news-rss";

import { useNewsLayout } from "./news-layout-context";

export const Route = createFileRoute("/_auth/news/")({
  component: NewsIndexPage,
  loader: ({ context }) => {
    context.zero.run(queries.news.events());
    context.zero.run(queries.brokerage.positions());
    context.zero.run(queries.news.rssSidebar());
  },
  staticData: { title: "News" },
});

function NewsIndexPage() {
  const { events } = useFinancialEvents();
  const { items: rssItems } = useNewsRssSidebar();
  const { positions } = useBrokerage();
  const { openAddAccount } = useCommandMenu();
  const { activeTab } = useNewsLayout();

  const holdingSymbols = useMemo(() => {
    const s = new Set<string>();
    for (const p of positions as readonly {
      security?: { symbol?: string | null } | null;
    }[]) {
      const raw = p.security?.symbol;
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
      tab={activeTab}
      eventsGeneral={events}
      eventsForYou={eventsForYou}
      onConnectAccount={openAddAccount}
      renderEventLink={(event, inner) => (
        <Link
          className="text-foreground block rounded-2xl no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
          params={{ eventId: event.id }}
          to="/news/$eventId"
        >
          {inner}
        </Link>
      )}
      rssItems={rssItems}
    />
  );
}

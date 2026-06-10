import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Toaster } from "@cobalt-web/ui/components/sonner";

import { ZeroProvider } from "../lib/zero-provider";

export interface AuthSnapshot {
  isPending: boolean;
  user: { id: string; username?: string | null } | null;
}

export interface RouterContext {
  queryClient: QueryClient;
  auth: AuthSnapshot;
}

const SITE_URL = "https://friends.cobaltpf.com";
const SITE_NAME = "Pocketwatch";
const DESCRIPTION = "See where your friends spend money.";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_NAME },
      { name: "description", content: DESCRIPTION },
      // Open Graph — controls iMessage, Slack, Discord, Facebook link cards.
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: SITE_NAME },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE },
      // Twitter card.
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_NAME },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
      // Theme color = brand dark — matches the map chrome.
      { name: "theme-color", content: "#000000" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "canonical", href: SITE_URL },
    ],
    // JSON-LD SoftwareApplication payload for Google rich results + LLM
    // crawlers (ChatGPT, Perplexity) that can't run our JS to read the map.
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: SITE_NAME,
          description: DESCRIPTION,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          url: SITE_URL,
          image: OG_IMAGE,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          publisher: { "@type": "Organization", name: "Cobalt" },
        }),
      },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <RootDocument>
      <Outlet />
      <Toaster />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  // QueryClient lives on router.context (see ../router.tsx) so the same
  // instance is reused across navigations and survives prerender → hydrate.
  const { queryClient } = Route.useRouteContext();
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        <QueryClientProvider client={queryClient}>
          <ZeroProvider>{children}</ZeroProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}

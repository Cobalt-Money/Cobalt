import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
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
  component: RootLayout,
  head: () => ({
    links: [
      { href: "/favicon.svg", rel: "icon", type: "image/svg+xml" },
      { href: SITE_URL, rel: "canonical" },
    ],
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { title: SITE_NAME },
      { content: DESCRIPTION, name: "description" },
      { content: "website", property: "og:type" },
      { content: SITE_NAME, property: "og:site_name" },
      { content: SITE_NAME, property: "og:title" },
      { content: DESCRIPTION, property: "og:description" },
      { content: SITE_URL, property: "og:url" },
      { content: OG_IMAGE, property: "og:image" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: SITE_NAME, name: "twitter:title" },
      { content: DESCRIPTION, name: "twitter:description" },
      { content: OG_IMAGE, name: "twitter:image" },
      { content: "#000000", name: "theme-color" },
    ],
    scripts: [
      {
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          applicationCategory: "FinanceApplication",
          description: DESCRIPTION,
          image: OG_IMAGE,
          name: SITE_NAME,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          operatingSystem: "Web",
          publisher: { "@type": "Organization", name: "Cobalt" },
          url: SITE_URL,
        }),
        type: "application/ld+json",
      },
    ],
  }),
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

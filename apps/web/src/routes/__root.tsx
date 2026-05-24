import { Toaster } from "@cobalt-web/ui/components/sonner";
import { ThemeProvider } from "@cobalt-web/ui/components/theme-provider";
import { TooltipProvider } from "@cobalt-web/ui/components/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
// import { Agentation } from "agentation";

import { UpgradePromptHost } from "../components/upgrade/upgrade-prompt-host";
import { AppSessionProvider } from "../lib/providers/app-session";
import { DemoProvider } from "../lib/providers/demo-provider";
import type { RouterContext } from "../router";
import "../bones/registry";
import appCss from "@cobalt-web/ui/globals.css?url";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
  TWITTER_HANDLE,
} from "@/lib/seo";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootDocument,

  head: () => ({
    links: [
      { href: "https://fonts.googleapis.com", rel: "preconnect" },
      {
        crossOrigin: "anonymous",
        href: "https://fonts.gstatic.com",
        rel: "preconnect",
      },
      { href: appCss, rel: "stylesheet" },
      { href: "/favicon.svg", rel: "icon", type: "image/svg+xml" },
      {
        href: "/favicon-32x32.png",
        rel: "icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        href: "/favicon-16x16.png",
        rel: "icon",
        sizes: "16x16",
        type: "image/png",
      },
      {
        href: "/apple-touch-icon.png",
        rel: "apple-touch-icon",
        sizes: "180x180",
      },
    ],
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { content: "#000000", name: "theme-color" },
      { title: DEFAULT_TITLE },
      { content: DEFAULT_DESCRIPTION, name: "description" },

      { content: DEFAULT_TITLE, property: "og:title" },
      { content: DEFAULT_DESCRIPTION, property: "og:description" },
      { content: "website", property: "og:type" },
      { content: SITE_URL, property: "og:url" },
      { content: DEFAULT_OG_IMAGE, property: "og:image" },
      { content: SITE_NAME, property: "og:site_name" },

      { content: "summary_large_image", name: "twitter:card" },
      { content: TWITTER_HANDLE, name: "twitter:site" },
      { content: DEFAULT_TITLE, name: "twitter:title" },
      { content: DEFAULT_DESCRIPTION, name: "twitter:description" },
      { content: DEFAULT_OG_IMAGE, name: "twitter:image" },
    ],
  }),
});

const FORCED_LIGHT_PATHS = new Set<string>(["/"]);
const FORCED_DARK_PATHS = new Set<string>(["/login"]);

function RootDocument() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  let forcedTheme: "light" | "dark" | undefined;
  if (FORCED_LIGHT_PATHS.has(pathname)) {
    forcedTheme = "light";
  } else if (FORCED_DARK_PATHS.has(pathname)) {
    forcedTheme = "dark";
  }

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    (async () => {
      await import("react-grab");
    })();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          next-themes applies class after hydration on Vite SPAs; public/theme-init.js
          aligns html.dark with localStorage before first paint (see ThemeProvider props).
        */}
        <script src="/theme-init.js" />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
          forcedTheme={forcedTheme}
        >
          <QueryClientProvider client={queryClient}>
            <AppSessionProvider>
              <DemoProvider>
                <TooltipProvider>
                  <Outlet />
                  <UpgradePromptHost />
                </TooltipProvider>
              </DemoProvider>
            </AppSessionProvider>
          </QueryClientProvider>
          <Toaster richColors />
        </ThemeProvider>
        {/* {import.meta.env.DEV ? <Agentation /> : null} */}
        {import.meta.env.DEV ? (
          <script crossOrigin="anonymous" src="https://tweakcn.com/live-preview.min.js" />
        ) : null}
        <Scripts />
      </body>
    </html>
  );
}

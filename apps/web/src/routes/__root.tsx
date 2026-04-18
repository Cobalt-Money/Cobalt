import { Toaster } from "@cobalt-web/ui/components/sonner";
import { ThemeProvider } from "@cobalt-web/ui/components/theme-provider";
import { TooltipProvider } from "@cobalt-web/ui/components/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { useEffect } from "react";
// import { Agentation } from "agentation";

import { AppSessionProvider } from "../lib/providers/app-session";
import type { RouterContext } from "../router";

import appCss from "../index.css?url";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootDocument,

  head: () => ({
    links: [
      {
        href: "https://fonts.googleapis.com",
        rel: "preconnect",
      },
      {
        crossOrigin: "anonymous",
        href: "https://fonts.gstatic.com",
        rel: "preconnect",
      },
      {
        href: appCss,
        rel: "stylesheet",
      },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        title: "My App",
      },
    ],
  }),
});

function RootDocument() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    (async () => {
      await import("react-grab");
    })();
  }, []);

  return (
    <html className="h-svh overflow-hidden" lang="en" suppressHydrationWarning>
      <head>
        {/*
          next-themes applies class after hydration on Vite SPAs; public/theme-init.js
          aligns html.dark with localStorage before first paint (see ThemeProvider props).
        */}
        <script src="/theme-init.js" />
        <HeadContent />
      </head>
      <body className="h-svh overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <QueryClientProvider client={queryClient}>
            <AppSessionProvider>
              <TooltipProvider>
                <div className="flex h-svh min-h-0 flex-col overflow-hidden">
                  <Outlet />
                </div>
              </TooltipProvider>
            </AppSessionProvider>
          </QueryClientProvider>
          <Toaster richColors />
        </ThemeProvider>
        {/* {import.meta.env.DEV ? <Agentation /> : null} */}
        {import.meta.env.DEV ? (
          <script
            crossOrigin="anonymous"
            src="https://tweakcn.com/live-preview.min.js"
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  );
}

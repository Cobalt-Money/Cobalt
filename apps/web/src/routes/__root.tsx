import { Toaster } from "@cobalt-web/ui/components/sonner";
import { ThemeProvider } from "@cobalt-web/ui/components/theme-provider";
import { TooltipProvider } from "@cobalt-web/ui/components/tooltip";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
// import { Agentation } from "agentation";

import { AppSessionProvider } from "../lib/providers/app-session";
import { ZeroProvider } from "../lib/providers/zero-client";

import appCss from "../index.css?url";

export const Route = createRootRouteWithContext<Record<string, never>>()({
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
        charSet: "utf8",
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
          <AppSessionProvider>
            <ZeroProvider>
              <TooltipProvider>
                <div className="flex h-svh min-h-0 flex-col overflow-hidden">
                  <Outlet />
                </div>
              </TooltipProvider>
            </ZeroProvider>
          </AppSessionProvider>
          <Toaster richColors />
        </ThemeProvider>
        {/* {import.meta.env.DEV ? <Agentation /> : null} */}
        {import.meta.env.DEV ? (
          <script
            crossOrigin="anonymous"
            src="https://tweakcn.com/live-preview.min.js"
          />
        ) : null}
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}

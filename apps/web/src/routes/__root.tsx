import { Toaster } from "@cobalt-web/ui/components/sonner";
import { TooltipProvider } from "@cobalt-web/ui/components/tooltip";
import type { Zero } from "@rocicorp/zero";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Agentation } from "agentation";

import { ZeroProvider } from "../lib/zero-client";

import appCss from "../index.css?url";

/** Set by root {@link ZeroProvider} when the Zero client is ready. See ztunes `ZeroInit`. */
export interface RouterAppContext {
  zero?: Zero;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
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
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <ZeroProvider>
          <TooltipProvider>
            <div className="min-h-svh">
              <Outlet />
            </div>
          </TooltipProvider>
        </ZeroProvider>
        <Toaster richColors />
        {import.meta.env.DEV ? <Agentation /> : null}
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

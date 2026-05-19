import { RootProvider } from "fumadocs-ui/provider/next";

import "./global.css";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";

const figtree = Figtree({
  subsets: ["latin"],
});

const SITE_URL = "https://docs.cobaltpf.com";
const SITE_DESC =
  "Documentation and API reference for the Cobalt financial platform.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Cobalt Docs", template: "%s | Cobalt Docs" },
  description: SITE_DESC,
  applicationName: "Cobalt Docs",
  openGraph: {
    type: "website",
    siteName: "Cobalt Docs",
    title: "Cobalt Docs",
    description: SITE_DESC,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Cobalt Docs",
    description: SITE_DESC,
  },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

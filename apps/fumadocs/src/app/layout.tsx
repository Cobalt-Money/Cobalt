import { RootProvider } from "fumadocs-ui/provider/next";

import "./global.css";
import { Figtree } from "next/font/google";

const figtree = Figtree({
  subsets: ["latin"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

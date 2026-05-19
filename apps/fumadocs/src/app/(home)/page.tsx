import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cobalt Docs",
  description:
    "Documentation and API reference for the Cobalt financial platform.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-4xl font-bold">Cobalt Docs</h1>
      <p className="text-fd-muted-foreground max-w-md">
        Documentation for the Cobalt financial platform.
      </p>
      <div className="flex gap-4">
        <Link
          href="/docs"
          className="rounded-lg bg-fd-primary px-4 py-2 text-fd-primary-foreground"
        >
          Get Started
        </Link>
        <Link
          href="/docs/mcp"
          className="rounded-lg border border-fd-border px-4 py-2"
        >
          MCP Server
        </Link>
      </div>
    </main>
  );
}

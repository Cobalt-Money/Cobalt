import { Sun02Icon, MoonIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useTheme } from "next-themes";

import { AppPreview } from "@/components/landing/app-preview";
import { Button } from "@/components/ui/button";
import { Cursor, CursorProvider } from "@/components/ui/cursor";
import { hasActiveSession } from "@/functions/has-active-session";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (await hasActiveSession()) {
      throw redirect({ to: "/ai-chat" });
    }
  },
  component: LandingPage,
  head: () => ({
    links: [
      { href: "https://fonts.googleapis.com", rel: "preconnect" },
      {
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0,1&display=swap",
        rel: "stylesheet",
      },
    ],
    meta: [
      { title: "Cobalt — Talk to your money" },
      {
        content:
          "Other finance apps give you homework. Cobalt gives you answers — ask anything about your money, from anywhere.",
        name: "description",
      },
      {
        content: "app-id=6757945133",
        name: "apple-itunes-app",
      },
    ],
  }),
});

function LandingStyles() {
  return (
    <style>{`
      .font-display { font-family: 'Instrument Serif', serif; }
    `}</style>
  );
}

function LandingPage() {
  return (
    <>
      <LandingStyles />
      <main className="flex h-svh flex-col overflow-auto no-scrollbar">
        <Nav />
        <Hero />
        <WorksWith />
        <FeatureShowcase />
        <FinalCTA />
        <Footer />
      </main>
    </>
  );
}

function Nav() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <span className="font-display text-xl">Cobalt</span>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          <HugeiconsIcon
            icon={isDark ? Sun02Icon : MoonIcon}
            size={18}
            strokeWidth={2}
          />
        </Button>
        <Link
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          to="/login"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="flex flex-col items-center gap-12 py-20 text-center">
      <div className="flex flex-col items-center gap-7 px-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Other finance apps give you homework
        </p>
        <h1 className="font-display max-w-4xl text-6xl italic tracking-tight sm:text-7xl lg:text-8xl">
          Talk to your money.
        </h1>
        <p className="max-w-sm text-xl text-muted-foreground">
          Spend seconds, not Sundays, on yours.
        </p>
        <Link
          className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90"
          to="/login"
        >
          Get started free
        </Link>
      </div>
      <CursorProvider className="mx-auto h-[80vh] w-[90%]">
        <Cursor className="pointer-events-none">
          <svg
            className="size-7 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 40 40"
          >
            <path
              fill="currentColor"
              d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
            />
          </svg>
        </Cursor>
        <AppPreview />
      </CursorProvider>
    </section>
  );
}

function WorksWith() {
  const surfaces = [
    "Claude",
    "Cursor",
    "ChatGPT",
    "Raycast",
    "Terminal",
    "VS Code",
    "Warp",
  ];
  return (
    <section className="border-y px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Works where you already do
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {surfaces.map((name) => (
            <span
              className="text-base font-medium text-foreground/60"
              key={name}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

interface ShowcaseProps {
  description: string;
  eyebrow: string;
  flip?: boolean;
  title: string;
  visual: React.ReactNode;
}

function Showcase({
  eyebrow,
  title,
  description,
  flip,
  visual,
}: ShowcaseProps) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
      <div className={flip ? "lg:order-2" : undefined}>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
        <h3 className="font-display mt-3 text-3xl italic tracking-tight sm:text-4xl lg:text-5xl">
          {title}
        </h3>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          {description}
        </p>
      </div>
      <div className={flip ? "lg:order-1" : undefined}>
        <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
          <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-3">
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
          </div>
          <div className="p-6">{visual}</div>
        </div>
      </div>
    </div>
  );
}

function FeatureShowcase() {
  return (
    <section className="px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mb-24 text-center">
          <h2 className="font-display text-5xl italic tracking-tight sm:text-6xl lg:text-7xl">
            Less budgeting.
            <br />
            More knowing.
          </h2>
        </div>

        <div className="flex flex-col gap-28 lg:gap-36">
          <Showcase
            description="Ask about your money from Claude, Cursor, or ChatGPT — no tab-switching, no copy-paste. Your finances go wherever you already think."
            eyebrow="MCP"
            title="Cobalt lives inside your chatbot."
            visual={<McpVisual />}
          />
          <Showcase
            description="Search a transaction. Categorize a charge. Jump to a holding. Hit ⌘K and type what you want — Cobalt does the rest."
            eyebrow="Command-K"
            flip
            title="Anything, in a keystroke."
            visual={<CommandKVisual />}
          />
          <Showcase
            description="Stop staring at charts hoping for a clue. Ask the question you actually have — and get a sentence back."
            eyebrow="Ask anything"
            title="Answers, not dashboards."
            visual={<ChatVisual />}
          />
          <Showcase
            description="Banks, brokerages, cards, crypto. Connect in minutes and Cobalt keeps everything fresh — so every answer uses every account."
            eyebrow="Every account"
            flip
            title="One brain for all your money."
            visual={<AccountsVisual />}
          />
          <Showcase
            description="Every recurring charge, surfaced before it hits. Cancel the ones you forgot you signed up for."
            eyebrow="Subscriptions"
            title="Catch what's bleeding you dry."
            visual={<SubscriptionsVisual />}
          />
          <Showcase
            description="Positions, cost basis, and performance across every brokerage — in one place you can actually ask questions about."
            eyebrow="Investments"
            flip
            title="Holdings without the spreadsheet."
            visual={<HoldingsVisual />}
          />
        </div>
      </div>
    </section>
  );
}

function McpVisual() {
  return (
    <div className="flex flex-col gap-3 font-mono text-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">
          you
        </span>
        <span>what did I spend on restaurants last month?</span>
      </div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-xs text-primary">cobalt</span>
        <div className="flex-1 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
            {`→ tool call: transactions.sum(category="restaurants")`}
          </div>
          <p className="leading-relaxed">
            $847 across 23 transactions — 18% over September. Three late-night
            Uber Eats orders did most of the damage.
          </p>
        </div>
      </div>
    </div>
  );
}

function CommandKVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 rounded-xl border bg-muted/20 px-3.5 py-3">
        <kbd className="rounded-md border bg-background px-2 py-0.5 text-xs font-medium shadow-sm">
          ⌘K
        </kbd>
        <span className="text-sm text-muted-foreground">
          categorize WHOLE FOODS #384…
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border">
        {[
          "Categorize as Groceries",
          "Mark as recurring",
          "Show all Whole Foods transactions",
          "Set a monthly cap",
        ].map((item, i) => (
          <div
            className={`flex items-center justify-between px-4 py-2.5 text-sm ${
              i === 0
                ? "bg-primary/10 text-primary"
                : "border-t text-muted-foreground"
            }`}
            key={item}
          >
            <span>{item}</span>
            {i === 0 && (
              <kbd className="rounded border bg-background/80 px-1.5 py-0.5 text-xs">
                ↵
              </kbd>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="space-y-4 text-sm">
      <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
        am I on track to hit $20k saved by December?
      </div>
      <div className="w-fit max-w-[90%] space-y-3 rounded-2xl rounded-bl-sm border bg-muted/30 px-4 py-3.5">
        <p className="leading-relaxed">
          Yes &mdash; you&apos;re at $16,820 and saving $1,240/mo on average.
          You&apos;ll clear $20k around November 18 if nothing changes.
        </p>
        <div className="flex h-14 items-end gap-1">
          {[30, 42, 38, 55, 61, 70, 78, 84, 92].map((h) => (
            <div
              className="flex-1 rounded-sm bg-primary/50"
              key={h}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountsVisual() {
  const accounts = [
    { bal: "$4,218", name: "Chase Checking" },
    { bal: "$18,430", name: "Ally Savings" },
    { bal: "$112,908", name: "Fidelity Brokerage" },
    { bal: "$2,104", name: "Amex Platinum" },
    { bal: "$8,762", name: "Coinbase" },
  ];
  return (
    <div className="space-y-2">
      {accounts.map((a) => (
        <div
          className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3"
          key={a.name}
        >
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-foreground/10" />
            <span className="text-sm font-medium">{a.name}</span>
          </div>
          <span className="font-mono text-sm">{a.bal}</span>
        </div>
      ))}
    </div>
  );
}

function SubscriptionsVisual() {
  const subs = [
    { amt: "$20", day: "Oct 3", name: "Netflix" },
    { amt: "$11", day: "Oct 7", name: "Spotify" },
    { amt: "$22", day: "Oct 12", name: "ChatGPT", warn: true },
    { amt: "$9", day: "Oct 14", name: "iCloud" },
    { amt: "$60", day: "Oct 20", name: "Planet Fitness", warn: true },
  ];
  return (
    <div className="space-y-1.5">
      {subs.map((s) => (
        <div
          className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-2.5 text-sm"
          key={s.name}
        >
          <div className="flex items-center gap-3">
            <span className="w-14 font-mono text-xs text-muted-foreground">
              {s.day}
            </span>
            <span className="font-medium">{s.name}</span>
            {s.warn && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                unused 60d
              </span>
            )}
          </div>
          <span className="font-mono">{s.amt}</span>
        </div>
      ))}
    </div>
  );
}

function HoldingsVisual() {
  const holdings = [
    { basis: "+42.1%", pct: "18%", ticker: "AAPL", value: "$24,102" },
    { basis: "+12.4%", pct: "14%", ticker: "VOO", value: "$18,840" },
    { basis: "+8.7%", pct: "12%", ticker: "NVDA", value: "$16,220" },
    { basis: "−3.2%", pct: "9%", ticker: "TSLA", value: "$12,005" },
    { basis: "+22.0%", pct: "7%", ticker: "MSFT", value: "$9,418" },
  ];
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-4 gap-2 border-b pb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span>Ticker</span>
        <span>Value</span>
        <span>%</span>
        <span className="text-right">Gain</span>
      </div>
      {holdings.map((h) => (
        <div className="grid grid-cols-4 gap-2 py-2.5 text-sm" key={h.ticker}>
          <span className="font-semibold">{h.ticker}</span>
          <span className="font-mono">{h.value}</span>
          <span className="font-mono text-muted-foreground">{h.pct}</span>
          <span
            className={`text-right font-mono text-xs ${
              h.basis.startsWith("−") ? "text-destructive" : "text-primary"
            }`}
          >
            {h.basis}
          </span>
        </div>
      ))}
    </div>
  );
}

function FinalCTA() {
  return (
    <section className="border-t px-6 py-28 text-center lg:py-36">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-7">
        <h2 className="font-display text-5xl italic tracking-tight sm:text-6xl lg:text-7xl">
          Ready to talk
          <br />
          to your money?
        </h2>
        <p className="text-lg text-muted-foreground">
          Two minutes to connect an account. Cobalt takes it from there.
        </p>
        <Link
          className="rounded-md bg-primary px-8 py-4 font-medium text-primary-foreground hover:opacity-90"
          to="/login"
        >
          Get started free
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-6 py-8 text-center text-sm text-muted-foreground">
      &copy; {new Date().getFullYear()} Cobalt. All rights reserved.
    </footer>
  );
}

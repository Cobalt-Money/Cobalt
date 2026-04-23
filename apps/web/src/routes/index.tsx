import { LogoCDN } from "@cobalt-web/ui/cobalt/logos/logo-cdn";
import { Sun02Icon, MoonIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { AppPreview } from "@/components/landing/app-preview";
import { Button } from "@/components/ui/button";
import { Cursor, CursorProvider } from "@/components/ui/cursor";

export const Route = createFileRoute("/")({
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
  bare?: boolean;
  description: string;
  eyebrow: string;
  flip?: boolean;
  title: string;
  visual: React.ReactNode;
}

function Showcase({
  bare,
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
        {bare ? (
          visual
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
            <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-3">
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
            </div>
            <div className="p-6">{visual}</div>
          </div>
        )}
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
            bare
            description="Ask about your money from Claude, Cursor, or ChatGPT — no tab-switching, no copy-paste. Your finances go wherever you already think."
            eyebrow="MCP"
            title="Cobalt lives inside your chatbot."
            visual={<McpVisual />}
          />
          <Showcase
            bare
            description="Plug Cobalt into ChatGPT as a connector. It reads your balances, categorizes spend, and answers questions — right inside the chat you already use."
            eyebrow="ChatGPT"
            flip
            title="Your money, inside ChatGPT."
            visual={<ChatGPTVisual />}
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

interface TerminalEntry {
  id: number;
  prompt: string;
}

function McpVisual() {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fullResponse = "I'd love to answer that. First, connect your accounts.";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      behavior: "smooth",
      top: scrollRef.current.scrollHeight,
    });
  }, [entries.length, streamingText.length]);

  useEffect(() => {
    if (!isStreaming || streamingText.length >= fullResponse.length) {
      return;
    }
    const timer = setTimeout(() => {
      setStreamingText(fullResponse.slice(0, streamingText.length + 1));
    }, 15);
    return () => clearTimeout(timer);
  }, [isStreaming, streamingText]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    setEntries((prev) => [...prev, { id: Date.now(), prompt: trimmed }]);
    setDraft("");
    setStreamingText("");
    setIsStreaming(true);
  };

  return (
    <div
      className="w-full overflow-hidden rounded-lg border bg-[#1a1a1a] shadow-2xl shadow-black/40"
      onClick={(e) => {
        if (
          e.target === e.currentTarget ||
          !(e.target as HTMLElement).closest("a, input")
        ) {
          inputRef.current?.focus();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          inputRef.current?.focus();
        }
      }}
      role="application"
      style={{
        fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
      }}
    >
      <div className="relative flex items-center gap-1.5 border-b border-white/10 bg-[#2d2d2d] px-3 py-2">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <span className="-translate-x-1/2 absolute left-1/2 text-[11px] text-white/40">
          ~/projects/finances — claude
        </span>
      </div>

      <div
        className="max-h-[440px] overflow-y-auto p-4 text-[12px] text-[#e6e4dd] leading-[1.55] no-scrollbar"
        ref={scrollRef}
      >
        <div className="mb-3 rounded border border-[#d97757]/40 bg-[#d97757]/5 px-3 py-2">
          <div>
            <span className="text-[#d97757]">✻</span>
            <span className="ml-2 text-white/90">Welcome to Claude Code!</span>
          </div>
          <div className="mt-1 pl-5 text-[11px] text-white/40">
            /help for help, /status for your current setup
          </div>
          <div className="mt-1 pl-5 text-[11px] text-white/40">
            cwd: /Users/alex/projects/finances
          </div>
        </div>

        <div className="text-white/90">
          <span className="text-white/40">&gt;</span>
          <span className="ml-2">
            what did I spend on restaurants last month?
          </span>
        </div>
        <div className="mt-3">
          <span className="text-[#d97757]">⏺</span>
          <span className="ml-2 text-white/80">
            I'll check your restaurant spending via Cobalt.
          </span>
        </div>
        <div className="mt-3">
          <span className="text-[#7fb069]">⏺</span>
          <span className="ml-2 text-white/90">cobalt - </span>
          <span className="text-[#d0c58a]">transactions_sum</span>
          <span className="text-white/50">(category: </span>
          <span className="text-[#9ccc8d]">"restaurants"</span>
          <span className="text-white/50">, period: </span>
          <span className="text-[#9ccc8d]">"last_month"</span>
          <span className="text-white/50">)</span>
        </div>
        <div className="mt-0.5 pl-5 text-white/50">
          <span>⎿</span>
          <span className="ml-2 text-white/60">
            total: $847.23 · count: 23 · vs_prev: +18%
          </span>
        </div>
        <div className="mt-3">
          <span className="text-[#d97757]">⏺</span>
          <span className="ml-2 text-white/90">
            You spent <span className="text-white">$847</span> on restaurants
            last month across 23 transactions —{" "}
            <span className="text-[#febc2e]">18% over</span> September. Three
            late-night Uber Eats orders did most of the damage.
          </span>
        </div>

        {entries.map((entry, idx) => (
          <div key={entry.id}>
            <div className="mt-4 text-white/90">
              <span className="text-white/40">&gt;</span>
              <span className="ml-2">{entry.prompt}</span>
            </div>
            {idx === entries.length - 1 && isStreaming ? (
              <>
                <div className="mt-3">
                  <span className="text-[#d97757]">⏺</span>
                  <span className="ml-2 text-white/80">
                    {streamingText}
                    {streamingText.length < fullResponse.length && (
                      <span className="animate-pulse">_</span>
                    )}
                  </span>
                </div>
                {streamingText.length >= fullResponse.length && (
                  <>
                    <div className="mt-2">
                      <span className="text-[#febc2e]">⏺</span>
                      <span className="ml-2 text-white/70">
                        cobalt mcp · not authenticated
                      </span>
                    </div>
                    <div className="mt-2 pl-5">
                      <Link
                        className="inline-flex items-center gap-1.5 rounded border border-[#d97757]/50 bg-[#d97757]/10 px-2.5 py-1 text-[#d97757] text-[11px] hover:bg-[#d97757]/20"
                        to="/login"
                      >
                        → Sign in to Cobalt
                      </Link>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="mt-3">
                  <span className="text-[#d97757]">⏺</span>
                  <span className="ml-2 text-white/80">{fullResponse}</span>
                </div>
                <div className="mt-2">
                  <span className="text-[#febc2e]">⏺</span>
                  <span className="ml-2 text-white/70">
                    cobalt mcp · not authenticated
                  </span>
                </div>
                <div className="mt-2 pl-5">
                  <Link
                    className="inline-flex items-center gap-1.5 rounded border border-[#d97757]/50 bg-[#d97757]/10 px-2.5 py-1 text-[#d97757] text-[11px] hover:bg-[#d97757]/20"
                    to="/login"
                  >
                    → Sign in to Cobalt
                  </Link>
                </div>
              </>
            )}
          </div>
        ))}

        <div className="mt-4 rounded border border-white/15 px-3 py-2">
          <div className="flex items-center gap-2 text-white/70">
            <span className="text-[#d97757]">&gt;</span>
            <input
              className="flex-1 border-none bg-transparent text-white/90 placeholder-white/30 outline-none"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={
                entries.length === 0
                  ? 'Try "rebalance my portfolio"'
                  : "Ask anything about your money…"
              }
              ref={inputRef}
              type="text"
              value={draft}
            />
            {draft.length === 0 && (
              <span className="inline-block h-[13px] w-[6px] animate-pulse bg-white/60" />
            )}
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/35">
          <span>? for shortcuts</span>
          <span>
            cobalt mcp ·{" "}
            {entries.length > 0 ? (
              <span className="text-[#febc2e]">sign in required</span>
            ) : (
              <span className="text-[#7fb069]">connected</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

interface GPTEntry {
  id: number;
  prompt: string;
  response: string;
  tool: { args: string; name: string; result: string };
}

const GPT_SCRIPTED: Omit<GPTEntry, "id" | "prompt">[] = [
  {
    response:
      "Your net worth across all connected accounts is **$146,422**, up **2.3%** this month. Your Fidelity brokerage drove most of the gain (+$2,840).",
    tool: {
      args: '{ "include": ["cash", "investments", "crypto"] }',
      name: "cobalt.net_worth",
      result: "{ total: 146422, delta_30d: 3287, delta_pct: 2.3 }",
    },
  },
  {
    response:
      "You spent **$312** on coffee over the last 90 days — 47 transactions, averaging $6.63. Blue Bottle leads at $118.",
    tool: {
      args: '{ "category": "coffee", "period": "90d" }',
      name: "cobalt.transactions_sum",
      result: "{ total: 312.11, count: 47, top: 'Blue Bottle' }",
    },
  },
  {
    response:
      "You have **3 subscriptions** you haven't used in 60+ days: Planet Fitness ($60/mo), Adobe CC ($55/mo), and Headspace ($13/mo). Canceling saves $1,536/yr.",
    tool: {
      args: '{ "unused_days": 60 }',
      name: "cobalt.subscriptions_list",
      result: "{ count: 3, annualized_savings: 1536 }",
    },
  },
];

function renderMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return (
        <strong className="font-semibold text-white" key={i}>
          {chunk.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{chunk}</span>;
  });
}

function ChatGPTVisual() {
  const conversations: Record<string, GPTEntry[]> = {
    "Cobalt finances": [
      {
        id: 0,
        prompt: "what's my net worth right now?",
        response:
          "Your net worth across all connected accounts is **$146,422**, up **2.3%** this month. Your Fidelity brokerage drove most of the gain (+$2,840).",
        tool: {
          args: '{ "include": ["cash", "investments", "crypto"] }',
          name: "cobalt.net_worth",
          result: "{ total: 146422, delta_30d: 3287, delta_pct: 2.3 }",
        },
      },
    ],
    "Trip to Lisbon": [
      {
        id: 1,
        prompt: "help me plan a trip to Lisbon",
        response:
          "I'll help you plan your trip to Lisbon! Let me check your financial situation to see how much you can comfortably spend.",
        tool: {
          args: '{ "include": ["checking", "savings"] }',
          name: "cobalt.accounts_summary",
          result: '{ "available_cash": 8945, "monthly_income": 4200 }',
        },
      },
      {
        id: 2,
        prompt: "how many days should I go for",
        response:
          "Based on your available funds, a 5-7 day trip would be ideal. You could budget roughly $1,200-1,500 total (flights + accommodation + activities). With your monthly income, this won't strain your finances.",
        tool: {
          args: '{ "available": 8945, "monthly_income": 4200, "trip_duration": 7 }',
          name: "cobalt.budget_recommendation",
          result:
            '{ "recommended_budget": 1350, "breakeven_months": 0.3, "savings_impact": "minimal" }',
        },
      },
    ],
  };

  const [entries, setEntries] = useState<GPTEntry[]>(
    conversations["Trip to Lisbon"]
  );
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showToolDetail, setShowToolDetail] = useState<number | null>(null);
  const [activeConversation, setActiveConversation] =
    useState("Trip to Lisbon");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const brandfetchClientId = process.env.VITE_BRANDFETCH_CLIENT_ID || "";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      behavior: "smooth",
      top: scrollRef.current.scrollHeight,
    });
  }, [entries.length, streaming.length]);

  useEffect(() => {
    if (!isStreaming || entries.length === 0) {
      return;
    }
    const target = entries.at(-1)?.response ?? "";
    if (streaming.length >= target.length) {
      setIsStreaming(false);
      return;
    }
    const timer = setTimeout(() => {
      setStreaming(target.slice(0, streaming.length + 1));
    }, 12);
    return () => clearTimeout(timer);
  }, [isStreaming, streaming, entries]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    const scripted = GPT_SCRIPTED[entries.length % GPT_SCRIPTED.length];
    setEntries((prev) => [
      ...prev,
      { id: Date.now(), prompt: trimmed, ...scripted },
    ]);
    setDraft("");
    setStreaming("");
    setIsStreaming(true);
  };

  const switchConversation = (name: string) => {
    setActiveConversation(name);
    setEntries(conversations[name] || []);
    setDraft("");
    setStreaming("");
    setIsStreaming(false);
  };

  return (
    <div
      className="flex h-[520px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#212121] shadow-2xl shadow-black/40"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("a, input, button")) {
          inputRef.current?.focus();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          inputRef.current?.focus();
        }
      }}
      role="application"
    >
      <aside className="hidden w-[150px] flex-col border-r border-white/5 bg-[#171717] p-1.5 text-[11px] text-white/80 sm:flex">
        {brandfetchClientId && (
          <div className="mb-3 flex items-center justify-center">
            <LogoCDN
              domain="openai.com"
              clientId={brandfetchClientId}
              fallbackText="O"
              logoApiSize={24}
              className="size-6"
              imgClassName="size-6"
            />
          </div>
        )}
        <div className="mt-2 px-2 text-[11px] uppercase tracking-wider text-white/40">
          Today
        </div>
        {["Cobalt finances", "Trip to Lisbon", "React hooks refresher"].map(
          (name) => (
            <button
              className={`mt-0.5 w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                activeConversation === name
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white/80"
              }`}
              key={name}
              onClick={() => switchConversation(name)}
              type="button"
            >
              {name}
            </button>
          )
        )}
        <div className="mt-auto flex items-center gap-2 rounded-md px-2 py-2 text-white/70">
          <div className="flex size-6 items-center justify-center rounded-full bg-[#ab68ff] text-[11px] font-semibold text-white">
            A
          </div>
          Alex
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/5 px-4 py-3 text-white/90">
          <div className="flex items-center gap-2 text-[14px] font-medium">
            ChatGPT
            <span className="text-white/40">5</span>
            <svg
              className="size-3 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[#10a37f]/40 bg-[#10a37f]/10 px-2 py-0.5 text-[11px] text-[#10a37f]">
            <span className="size-1.5 rounded-full bg-[#10a37f]" />
            Cobalt connected
          </div>
        </header>

        <div
          className="flex-1 overflow-y-auto px-6 py-5 text-[14px] text-white/90 no-scrollbar"
          ref={scrollRef}
        >
          <div className="mx-auto max-w-2xl space-y-5">
            {entries.map((entry, idx) => {
              const isLast = idx === entries.length - 1;
              const text = isLast && isStreaming ? streaming : entry.response;
              return (
                <div className="space-y-5" key={entry.id}>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-3xl bg-[#2f2f2f] px-4 py-2.5 leading-relaxed">
                      {entry.prompt}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/70 hover:bg-white/10"
                      onClick={() =>
                        setShowToolDetail(
                          showToolDetail === entry.id ? null : entry.id
                        )
                      }
                      type="button"
                    >
                      <span className="flex size-4 items-center justify-center rounded bg-gradient-to-br from-amber-300 to-amber-600 text-[9px] font-bold text-black">
                        C
                      </span>
                      Used <span className="text-white">Cobalt</span>
                      <span className="text-white/40">
                        · {entry.tool.name.replace("cobalt.", "")}
                      </span>
                      <svg
                        className={`size-3 transition-transform ${showToolDetail === entry.id ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M19 9l-7 7-7-7"
                          strokeLinecap="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                    {showToolDetail === entry.id && (
                      <div className="space-y-1 rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[11px] text-white/70">
                        <div>
                          <span className="text-[#10a37f]">→</span>{" "}
                          <span className="text-white/90">
                            {entry.tool.name}
                          </span>
                          <span className="text-white/50">
                            ({entry.tool.args})
                          </span>
                        </div>
                        <div>
                          <span className="text-white/40">←</span>{" "}
                          <span className="text-[#d0c58a]">
                            {entry.tool.result}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="leading-relaxed">
                      {renderMarkdown(text)}
                      {isLast && isStreaming && (
                        <span className="ml-0.5 inline-block size-2 animate-pulse rounded-full bg-white/60" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-white/10 bg-[#2f2f2f] px-3 py-1.5">
            <button className="text-white/50 hover:text-white/80" type="button">
              <svg
                className="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 4v16m8-8H4"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
            <input
              className="flex-1 border-none bg-transparent text-[14px] text-white outline-none"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              ref={inputRef}
              type="text"
              value={draft}
            />
            <button
              className="flex size-6 items-center justify-center rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-30"
              disabled={!draft.trim()}
              onClick={submit}
              type="button"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 19V5M5 12l7-7 7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>
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

interface ChatEntry {
  id: number;
  prompt: string;
}

function ChatVisual() {
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatStreamingText, setChatStreamingText] = useState("");
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const chatResponse =
    "To answer that, I need to connect to your accounts. Sign in to Cobalt and I can give you real-time insights about your savings goals and help you make better financial decisions.";

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      behavior: "smooth",
      top: chatScrollRef.current.scrollHeight,
    });
  }, [chatEntries.length, chatStreamingText.length]);

  useEffect(() => {
    if (!isChatStreaming || chatStreamingText.length >= chatResponse.length) {
      return;
    }
    const timer = setTimeout(() => {
      setChatStreamingText(chatResponse.slice(0, chatStreamingText.length + 1));
    }, 15);
    return () => clearTimeout(timer);
  }, [isChatStreaming, chatStreamingText]);

  const chatSubmit = () => {
    const trimmed = chatDraft.trim();
    if (!trimmed) {
      return;
    }
    setChatEntries((prev) => [...prev, { id: Date.now(), prompt: trimmed }]);
    setChatDraft("");
    setChatStreamingText("");
    setIsChatStreaming(true);
  };

  return (
    <div className="flex h-[420px] flex-col rounded-2xl border bg-background overflow-hidden shadow-sm">
      <div
        className="flex-1 space-y-4 overflow-y-auto p-4 text-sm no-scrollbar"
        ref={chatScrollRef}
      >
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground">
            am I on track to hit $20k saved by December?
          </div>
        </div>
        <div className="space-y-2">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm border bg-muted/30 px-4 py-3">
            <p className="leading-relaxed">
              Yes &mdash; you&apos;re at $16,820 and saving $1,240/mo on
              average. You&apos;ll clear $20k around November 18 if nothing
              changes.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground pl-2">
            <button className="rounded p-1 hover:bg-muted text-foreground/50">
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-2.93a2 2 0 00-1.41.59l-2.17 1.83a1 1 0 01-1.6-.74V16z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
            <button className="rounded p-1 hover:bg-muted text-foreground/50">
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m0 0l-2-1m2 1v2.5M14 4l-2 1m0 0l-2-1m2 1v2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
            <button className="rounded p-1 hover:bg-muted text-foreground/50">
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
            <button className="rounded p-1 hover:bg-muted text-foreground/50">
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M4 12a8 8 0 018-8v0m0 0a8 8 0 110 16v0m0-16v16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>
        </div>

        {chatEntries.map((entry, idx) => (
          <div key={entry.id} className="space-y-2">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground">
                {entry.prompt}
              </div>
            </div>
            {idx === chatEntries.length - 1 && isChatStreaming ? (
              <div className="space-y-2">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border bg-muted/30 px-4 py-3">
                  <p className="leading-relaxed">
                    {chatStreamingText}
                    {chatStreamingText.length < chatResponse.length && (
                      <span className="animate-pulse">▌</span>
                    )}
                  </p>
                </div>
                {chatStreamingText.length >= chatResponse.length && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pl-2">
                    <Link
                      className="inline-flex items-center gap-1.5 rounded border border-primary/50 bg-primary/10 px-3 py-1.5 text-primary hover:bg-primary/20"
                      to="/login"
                    >
                      Sign in to Cobalt
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border bg-muted/30 px-4 py-3">
                  <p className="leading-relaxed">{chatResponse}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground pl-2">
                  <Link
                    className="inline-flex items-center gap-1.5 rounded border border-primary/50 bg-primary/10 px-3 py-1.5 text-primary hover:bg-primary/20"
                    to="/login"
                  >
                    Sign in to Cobalt
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t p-3">
        <div className="flex items-end gap-2 rounded-full border bg-background px-3 py-2">
          <button className="flex size-6 flex-shrink-0 items-center justify-center rounded-full hover:bg-muted text-foreground/60">
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 5v14m7-7H5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
          <input
            className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onChange={(e) => setChatDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                chatSubmit();
              }
            }}
            placeholder="Ask anything"
            ref={chatInputRef}
            type="text"
            value={chatDraft}
          />
          <button
            className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background hover:opacity-90 disabled:opacity-50"
            disabled={!chatDraft.trim()}
            onClick={chatSubmit}
            type="button"
          >
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M5 12h14M12 5l7 7-7 7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
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

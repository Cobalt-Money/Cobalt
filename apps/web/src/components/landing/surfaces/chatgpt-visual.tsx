import { LogoCDN } from "@cobalt-web/ui/cobalt/logos/logo-cdn";
import { useEffect, useRef, useState } from "react";

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
      args: '{ "include": ["cash", "investments"] }',
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
        <strong className="font-semibold text-black dark:text-white" key={i}>
          {chunk.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{chunk}</span>;
  });
}

export function ChatGPTVisual() {
  const conversations: Record<string, GPTEntry[]> = {
    "Budget my Lisbon trip": [
      {
        id: 1,
        prompt: "help me budget a trip to Lisbon",
        response:
          "Let me pull your cash + monthly income to size the trip against your savings rate.",
        tool: {
          args: '{ "include": ["checking", "savings"] }',
          name: "cobalt.accounts_summary",
          result: '{ "available_cash": 8945, "monthly_income": 4200 }',
        },
      },
      {
        id: 2,
        prompt: "how many days can I afford?",
        response:
          "A 5–7 day trip fits — budget **$1,200–$1,500** total (flights + stay + activities). Pulls from cash, not your emergency fund. Won't move your savings rate more than 0.3 months.",
        tool: {
          args: '{ "available": 8945, "monthly_income": 4200, "trip_duration": 7 }',
          name: "cobalt.budget_recommendation",
          result:
            '{ "recommended_budget": 1350, "breakeven_months": 0.3, "savings_impact": "minimal" }',
        },
      },
    ],
    "Cancel unused subs": [
      {
        id: 3,
        prompt: "which subscriptions should I cancel?",
        response:
          "You have **3 subscriptions** you haven't used in 60+ days: Planet Fitness ($60/mo), Adobe CC ($55/mo), Headspace ($13/mo). Canceling saves **$1,536/yr**.",
        tool: {
          args: '{ "unused_days": 60 }',
          name: "cobalt.subscriptions_list",
          result: "{ count: 3, annualized_savings: 1536 }",
        },
      },
    ],
    "Coffee spend": [
      {
        id: 4,
        prompt: "how much have I spent on coffee this quarter?",
        response:
          "You spent **$312** on coffee over the last 90 days — 47 transactions, avg $6.63. Blue Bottle leads at $118.",
        tool: {
          args: '{ "category": "coffee", "period": "90d" }',
          name: "cobalt.transactions_sum",
          result: "{ total: 312.11, count: 47, top: 'Blue Bottle' }",
        },
      },
    ],
    "Emergency fund": [
      {
        id: 6,
        prompt: "is my emergency fund big enough?",
        response:
          "Your high-yield savings holds **$18,400** — covers **4.4 months** of essential spend ($4,180/mo). Target of 6 months would be $25,080. Auto-transfer $1,100/mo for 6 months to close the gap.",
        tool: {
          args: '{ "months_target": 6 }',
          name: "cobalt.emergency_fund_status",
          result: "{ liquid: 18400, essential_monthly: 4180, months_covered: 4.4, gap: 6680 }",
        },
      },
    ],
    "Net worth check": [
      {
        id: 0,
        prompt: "what's my net worth right now?",
        response:
          "Your net worth across all connected accounts is **$146,422**, up **2.3%** this month. Your Fidelity brokerage drove most of the gain (+$2,840).",
        tool: {
          args: '{ "include": ["cash", "investments"] }',
          name: "cobalt.net_worth",
          result: "{ total: 146422, delta_30d: 3287, delta_pct: 2.3 }",
        },
      },
    ],
    "Roth vs Traditional": [
      {
        id: 7,
        prompt: "Roth or Traditional this year?",
        response:
          "Your 24% bracket likely drops in retirement → **Traditional 401(k)** wins on expected tax. Backdoor Roth still makes sense for the $7K IRA — your MAGI is over the direct limit.",
        tool: {
          args: '{ "year": 2026 }',
          name: "cobalt.retirement_recommendation",
          result:
            "{ current_bracket: 0.24, projected_retirement_bracket: 0.22, backdoor_roth: true }",
        },
      },
    ],
    "Tax-loss harvest": [
      {
        id: 5,
        prompt: "any tax-loss harvesting opportunities?",
        response:
          "Two lots show paper losses: **VXUS** (-$420) and **EMB** (-$185). Selling now realizes **$605** of losses — offsets short-term gains first. Wash-sale window: stay out 31 days.",
        tool: {
          args: '{ "account_type": "taxable", "threshold": 100 }',
          name: "cobalt.tax_loss_candidates",
          result:
            '{ candidates: [{symbol: "VXUS", loss: 420}, {symbol: "EMB", loss: 185}], total_loss: 605 }',
        },
      },
    ],
  };

  const [entries, setEntries] = useState<GPTEntry[]>(conversations["Budget my Lisbon trip"]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showToolDetail, setShowToolDetail] = useState<number | null>(null);
  const [activeConversation, setActiveConversation] = useState("Budget my Lisbon trip");
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
    setEntries((prev) => [...prev, { id: Date.now(), prompt: trimmed, ...scripted }]);
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
      className="flex h-[520px] w-full overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#212121] shadow-2xl shadow-black/40"
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
      <aside className="hidden w-[150px] flex-col border-r border-black/5 dark:border-white/5 bg-[#f7f7f8] dark:bg-[#171717] p-1.5 text-[11px] text-[#1a1a1a]/75 dark:text-white/80 sm:flex">
        {brandfetchClientId && (
          <div className="mb-3 flex items-center justify-center">
            <LogoCDN
              className="size-6"
              clientId={brandfetchClientId}
              domain="openai.com"
              fallbackText="O"
              imgClassName="size-6"
              logoApiSize={24}
            />
          </div>
        )}
        <div className="mt-2 px-2 text-[11px] uppercase tracking-wider text-[#1a1a1a]/45 dark:text-white/40">
          Today
        </div>
        {[
          "Net worth check",
          "Budget my Lisbon trip",
          "Cancel unused subs",
          "Coffee spend",
          "Tax-loss harvest",
          "Emergency fund",
          "Roth vs Traditional",
        ].map((name) => (
          <button
            className={`mt-0.5 w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              activeConversation === name
                ? "bg-black/10 dark:bg-white/10 text-black dark:text-white"
                : "text-[#1a1a1a]/55 dark:text-white/60 hover:text-[#1a1a1a]/75 dark:hover:text-white/80"
            }`}
            key={name}
            onClick={() => switchConversation(name)}
            type="button"
          >
            {name}
          </button>
        ))}
        <div className="mt-auto flex items-center gap-2 rounded-md px-2 py-2 text-[#1a1a1a]/65 dark:text-white/70">
          <div className="flex size-6 items-center justify-center rounded-full bg-[#ab68ff] text-[11px] font-semibold text-white">
            R
          </div>
          Rust Cohle
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-black/5 dark:border-white/5 px-4 py-3 text-[#1a1a1a]/90 dark:text-white/90">
          <div className="flex items-center gap-2 text-[14px] font-medium">
            ChatGPT
            <span className="text-[#1a1a1a]/45 dark:text-white/40">5</span>
            <svg
              className="size-3 text-[#1a1a1a]/45 dark:text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
        </header>

        <div
          className="flex-1 overflow-y-auto px-6 py-5 text-[14px] text-[#1a1a1a]/90 dark:text-white/90 no-scrollbar"
          ref={scrollRef}
        >
          <div className="mx-auto max-w-md space-y-5">
            {entries.map((entry, idx) => {
              const isLast = idx === entries.length - 1;
              const text = isLast && isStreaming ? streaming : entry.response;
              return (
                <div className="space-y-5" key={entry.id}>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-3xl bg-[#f4f4f4] dark:bg-[#2f2f2f] px-4 py-2.5 leading-relaxed">
                      {entry.prompt}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      className="flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-1.5 text-[12px] text-[#1a1a1a]/65 dark:text-white/70 hover:bg-black/10 dark:bg-white/10"
                      onClick={() =>
                        setShowToolDetail(showToolDetail === entry.id ? null : entry.id)
                      }
                      type="button"
                    >
                      <span className="flex size-4 items-center justify-center rounded bg-gradient-to-br from-amber-300 to-amber-600 text-[9px] font-bold text-black">
                        C
                      </span>
                      Used <span className="text-black dark:text-white">Cobalt</span>
                      <span className="text-[#1a1a1a]/45 dark:text-white/40">
                        · {entry.tool.name.replace("cobalt.", "")}
                      </span>
                      <svg
                        className={`size-3 transition-transform ${showToolDetail === entry.id ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeWidth="2" />
                      </svg>
                    </button>
                    {showToolDetail === entry.id && (
                      <div className="space-y-1 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/30 p-3 font-mono text-[11px] text-[#1a1a1a]/65 dark:text-white/70">
                        <div>
                          <span className="text-[#10a37f]">→</span>{" "}
                          <span className="text-[#1a1a1a]/90 dark:text-white/90">
                            {entry.tool.name}
                          </span>
                          <span className="text-[#1a1a1a]/50 dark:text-white/50">
                            ({entry.tool.args})
                          </span>
                        </div>
                        <div>
                          <span className="text-[#1a1a1a]/45 dark:text-white/40">←</span>{" "}
                          <span className="text-[#d0c58a]">{entry.tool.result}</span>
                        </div>
                      </div>
                    )}
                    <div className="leading-relaxed">
                      {renderMarkdown(text)}
                      {isLast && isStreaming && (
                        <span className="ml-0.5 inline-block size-2 animate-pulse rounded-full bg-black/60 dark:bg-white/60" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="mx-auto flex max-w-md items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-[#f4f4f4] dark:bg-[#2f2f2f] px-3 py-1.5">
            <button
              className="text-[#1a1a1a]/50 dark:text-white/50 hover:text-[#1a1a1a]/75 dark:text-white/80"
              type="button"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeWidth="2" />
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
              className="flex size-6 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black hover:bg-black/80 dark:hover:bg-white/90 disabled:opacity-30"
              disabled={!draft.trim()}
              onClick={submit}
              type="button"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

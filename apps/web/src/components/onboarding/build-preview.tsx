import { cn } from "@cobalt-web/ui/lib/utils";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";

import { useAppSession } from "@/lib/providers/app-session";

const PROMPT = "Build me an app to track my grocery spending by store.";

const LOOP_DURATION = 10;
const TYPE_START = 0.05;
const TYPE_END = 0.32;
const SEND_HOLD = 0.34;
const BUILD_START = 0.4;
const APP_REVEAL = 0.65;

const CHART_DATA = [
  { amt: 280, store: "Trader Joe's" },
  { amt: 410, store: "Whole Foods" },
  { amt: 520, store: "Costco" },
  { amt: 180, store: "Safeway" },
  { amt: 95, store: "H-E-B" },
];

export function BuildPreview() {
  const session = useAppSession();
  const fullName = session.data?.user.name?.trim() ?? "";
  const firstSlug =
    (fullName.split(/\s+/)[0] ?? "your").toLowerCase().replaceAll(/[^a-z0-9]/g, "") || "your";
  const appUrl = `${firstSlug}.finance.com`;

  const [inputText, setInputText] = useState("");
  const [sentText, setSentText] = useState("");
  const [phase, setPhase] = useState<"idle" | "building" | "ready">("idle");

  useEffect(() => {
    let raf = 0;
    const startedAt = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const p = ((elapsed / 1000) % LOOP_DURATION) / LOOP_DURATION;
      const blinkOn = Math.floor(elapsed / 500) % 2 === 0;
      const caret = blinkOn ? "|" : " ";

      if (p < TYPE_START) {
        setInputText("");
        setSentText("");
        setPhase("idle");
      } else if (p < TYPE_END) {
        const t = (p - TYPE_START) / (TYPE_END - TYPE_START);
        const len = Math.floor(t * PROMPT.length);
        setInputText(PROMPT.slice(0, len) + caret);
        setSentText("");
        setPhase("idle");
      } else if (p < SEND_HOLD) {
        setInputText(PROMPT);
        setSentText("");
        setPhase("idle");
      } else if (p < BUILD_START) {
        setInputText("");
        setSentText(PROMPT);
        setPhase("idle");
      } else if (p < APP_REVEAL) {
        setInputText("");
        setSentText(PROMPT);
        setPhase("building");
      } else {
        setInputText("");
        setSentText(PROMPT);
        setPhase("ready");
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex h-[400px] w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-background text-left shadow-lg">
      {/* Single browser chrome wraps both panes */}
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center gap-1.5 border-border border-b bg-muted/40 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <span className="ml-2 truncate text-[10px] text-muted-foreground">
            cobalt apps · grocery tracker
          </span>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Left chat pane */}
          <div className="flex w-[30%] shrink-0 flex-col border-border border-r">
            <div className="px-3 pt-3 pb-2 font-semibold text-[11px]">Grocery Tracker</div>
            <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-3 pb-2 text-[10px]">
              <motion.div
                animate={sentText ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                initial={false}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="rounded-lg border border-border bg-muted/40 p-2 text-foreground"
              >
                {sentText || PROMPT}
              </motion.div>

              <Step phase={phase} reveal="building">
                <span className="text-muted-foreground">
                  Read <span className="text-foreground/80">cobalt-mcp-spec.md</span>
                </span>
              </Step>
              <Step phase={phase} reveal="building">
                <span className="text-muted-foreground">
                  Called <span className="text-foreground/80">cobalt.transactions.list</span>
                </span>
              </Step>
              <Step phase={phase} reveal="building">
                <span className="text-muted-foreground">
                  Thought <span className="opacity-60">8s</span>
                </span>
              </Step>
              <Step phase={phase} reveal="ready">
                <span className="text-foreground/85 leading-snug">
                  Built a 5-store grocery dashboard from your last 30 days of transactions via{" "}
                  <span className="font-mono text-[10px]">@cobalt/mcp</span>.
                </span>
              </Step>
              {[
                { add: "+184", del: "−0", file: "app/grocery/page.tsx" },
                { add: "+62", del: "−2", file: "lib/queries.ts" },
                { add: "+38", del: "−0", file: "components/store-bar.tsx" },
              ].map((d) => (
                <Step key={d.file} phase={phase} reveal="ready">
                  <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1">
                    <span className="text-muted-foreground">📄</span>
                    <span className="truncate text-foreground/85">{d.file}</span>
                    <span className="ml-auto text-emerald-600 text-[9px]">{d.add}</span>
                    <span className="text-rose-600 text-[9px]">{d.del}</span>
                  </div>
                </Step>
              ))}
              <Step phase={phase} reveal="ready">
                <span className="text-foreground/85 leading-snug">
                  Done. Live at <span className="font-mono text-[10px]">/grocery</span>.
                </span>
              </Step>
            </div>
            <div className="p-2">
              <div className="rounded-xl border border-border bg-muted/20 px-2.5 py-2">
                <div
                  className={cn(
                    "truncate text-[10px]",
                    inputText ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {inputText || "Plan, search, build anything…"}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5">
                    ∞ Agent ▾
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5">
                    Composer 2 ▾
                  </span>
                  <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-foreground text-background text-[10px]">
                    ↑
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right preview pane */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-1.5 border-border border-b bg-muted/20 px-2 py-1.5">
              <button
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                type="button"
              >
                <svg
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                type="button"
              >
                <svg
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              <button
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                type="button"
              >
                <svg
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
              <div className="flex flex-1 items-center gap-1 truncate rounded-md bg-muted/40 px-2 py-0.5 text-[9px] text-muted-foreground">
                <svg
                  className="size-2.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span className="truncate">{appUrl}</span>
              </div>
              <button
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                type="button"
              >
                <svg
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M16 3h5v5" />
                  <path d="M21 3l-7 7" />
                  <path d="M5 12v7a2 2 0 0 0 2 2h7" />
                </svg>
              </button>
              <button
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                type="button"
              >
                <svg
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
            </div>
            <div className="relative flex-1 overflow-hidden">
              {/* Empty state */}
              <motion.div
                animate={phase === "idle" ? { opacity: 1 } : { opacity: 0 }}
                initial={false}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="text-[10px] text-muted-foreground">Your app will appear here</span>
              </motion.div>

              {/* Building skeleton */}
              <motion.div
                animate={phase === "building" ? { opacity: 1 } : { opacity: 0 }}
                initial={false}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex flex-col gap-2 p-4"
              >
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted/70" />
                <div className="mt-3 h-24 animate-pulse rounded-lg bg-muted/50" />
                <div className="mt-2 flex gap-2">
                  <div className="h-8 flex-1 animate-pulse rounded bg-muted/60" />
                  <div className="h-8 flex-1 animate-pulse rounded bg-muted/60" />
                </div>
              </motion.div>

              {/* Ready app */}
              <motion.div
                animate={phase === "ready" ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                initial={false}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="absolute inset-0 flex flex-col gap-3 overflow-hidden bg-gradient-to-br from-background to-muted/30 p-5"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-lg tracking-tight">Grocery Tracker</h2>
                    <p className="text-[10px] text-muted-foreground">
                      Last 30 days · {CHART_DATA.length} stores
                    </p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-[10px] text-emerald-600">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border bg-background/60 p-2.5">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                      Total
                    </div>
                    <div className="mt-0.5 font-semibold tabular-nums">$1,485</div>
                    <div className="text-[9px] text-rose-600">+12% MoM</div>
                  </div>
                  <div className="rounded-lg border border-border bg-background/60 p-2.5">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                      Avg / visit
                    </div>
                    <div className="mt-0.5 font-semibold tabular-nums">$48</div>
                    <div className="text-[9px] text-emerald-600">−$6 vs last</div>
                  </div>
                  <div className="rounded-lg border border-border bg-background/60 p-2.5">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                      Visits
                    </div>
                    <div className="mt-0.5 font-semibold tabular-nums">31</div>
                    <div className="text-[9px] text-muted-foreground">1 per day</div>
                  </div>
                </div>

                {/* Chart */}
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-[10px]">Spend by store</span>
                    <span className="text-[9px] text-muted-foreground">30d</span>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer height="100%" width="100%">
                      <BarChart data={CHART_DATA} margin={{ bottom: 0, left: 0, right: 0, top: 4 }}>
                        <XAxis
                          axisLine={false}
                          dataKey="store"
                          fontSize={8}
                          tick={{ fill: "currentColor", opacity: 0.6 }}
                          tickLine={false}
                        />
                        <Bar dataKey="amt" fill="currentColor" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top stores list */}
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-medium text-[10px]">Top stores</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {[...CHART_DATA]
                      .toSorted((a, b) => b.amt - a.amt)
                      .slice(0, 3)
                      .map((s) => {
                        const max = Math.max(...CHART_DATA.map((d) => d.amt));
                        const pct = (s.amt / max) * 100;
                        return (
                          <div key={s.store} className="flex items-center gap-2">
                            <span className="w-20 truncate text-[10px]">{s.store}</span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-foreground/80"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-10 text-right font-medium text-[10px] tabular-nums">
                              ${s.amt}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({
  children,
  phase,
  reveal,
}: {
  children: React.ReactNode;
  phase: "idle" | "building" | "ready";
  reveal: "building" | "ready";
}) {
  const shown = reveal === "building" ? phase !== "idle" : phase === "ready";
  return (
    <motion.div
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
      initial={false}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

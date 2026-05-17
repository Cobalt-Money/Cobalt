import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { Badge } from "@cobalt-web/ui/components/badge";
import { Button } from "@cobalt-web/ui/components/button";
import { Card, CardContent } from "@cobalt-web/ui/components/card";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from "recharts";

const IN_PROGRESS = [
  { sub: "Fetching merchants", title: "Categorize Q4 transactions" },
  { sub: "Generating estimate", title: "Project FY taxes" },
];

const READY = [
  {
    active: true,
    sub: "Done. Preview ready at /dashboard.",
    time: "now",
    title: "Build finance dashboard",
  },
  { sub: "Matched 312 lots", time: "12m", title: "Reconcile Fidelity brokerage" },
  { sub: "+184 −22 · webhooks/plaid", time: "34m", title: "Wire Plaid webhook handler" },
  { sub: "+135 −21 · trpc routers", time: "48m", title: "Refactor net worth API" },
];

const KPI = [
  { delta: "+$4,210 · 2.3%", label: "Net Worth", up: true, val: "$184,302" },
  { delta: "−$612 · 13%", label: "Monthly Spend", up: true, val: "$3,840" },
  { delta: "+$0", label: "Monthly Income", up: true, val: "$8,200" },
];

const SPEND_BARS = [
  { m: "May", v: 3840 },
  { m: "Jun", v: 5210 },
  { m: "Jul", v: 4420 },
  { m: "Aug", v: 6080 },
  { m: "Sep", v: 4830 },
  { m: "Oct", v: 5820 },
  { active: true, m: "Nov", v: 3840 },
];

const RECENT_TX = [
  {
    amt: "−$84.20",
    cat: "Groceries",
    day: "Today",
    merchant: "Whole Foods",
    website: "wholefoodsmarket.com",
  },
  {
    amt: "+$4,210.00",
    cat: "Income",
    day: "Yesterday",
    merchant: "Payroll · Acme Inc.",
    pos: true,
    website: "",
  },
  { amt: "−$18.40", cat: "Transit", day: "Yesterday", merchant: "Uber", website: "uber.com" },
  { amt: "−$15.49", cat: "Subscription", day: "2d", merchant: "Netflix", website: "netflix.com" },
  { amt: "−$500.00", cat: "Investment", day: "3d", merchant: "Vanguard", website: "vanguard.com" },
];

export function CursorVisual() {
  return (
    <div
      className="mx-auto flex h-[560px] w-full max-w-[1000px] flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f0f10]"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro', sans-serif" }}
    >
      {/* Title bar */}
      <div className="relative flex items-center border-b border-black/5 bg-[#f5f5f5] px-3 py-2.5 dark:border-white/5 dark:bg-[#161617]">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="-translate-x-1/2 absolute left-1/2 text-[12px] text-[#1a1a1a]/55 dark:text-white/55">
          Cursor Desktop
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar: tasks */}
        <aside className="hidden w-[220px] flex-col border-r border-black/5 px-3 py-3 text-[12px] dark:border-white/5 sm:flex">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#1a1a1a]/45 dark:text-white/45">
            IN PROGRESS {IN_PROGRESS.length}
          </div>
          <div className="mt-2 space-y-2">
            {IN_PROGRESS.map((t) => (
              <div className="flex gap-2 rounded-md px-1.5 py-1.5" key={t.title}>
                <span className="mt-0.5 inline-block size-3 animate-spin rounded-full border border-[#1a1a1a]/30 border-t-transparent dark:border-white/30" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[#1a1a1a]/85 dark:text-white/85">{t.title}</div>
                  <div className="truncate text-[11px] text-[#1a1a1a]/40 dark:text-white/40">
                    {t.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-[#1a1a1a]/45 dark:text-white/45">
            READY FOR REVIEW {READY.length}
          </div>
          <div className="mt-2 space-y-1">
            {READY.map((t) => (
              <div
                className={`flex gap-2 rounded-md px-1.5 py-1.5 ${
                  t.active ? "bg-black/[0.05] dark:bg-white/[0.06]" : ""
                }`}
                key={t.title}
              >
                <span className="mt-0.5 flex size-3.5 flex-shrink-0 items-center justify-center rounded-full border border-[#1a1a1a]/35 text-[8px] text-[#1a1a1a]/55 dark:border-white/35 dark:text-white/55">
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-[#1a1a1a]/85 dark:text-white/85">{t.title}</span>
                    <span className="ml-auto text-[10px] text-[#1a1a1a]/40 dark:text-white/40">
                      {t.time}
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-[#1a1a1a]/40 dark:text-white/40">
                    {t.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Middle: active task */}
        <section className="flex w-[330px] min-w-0 flex-col border-r border-black/5 dark:border-white/5">
          <div className="px-5 pt-4 pb-3 font-semibold text-[14px] text-[#1a1a1a] dark:text-white">
            Build finance dashboard
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-3 text-[13px] no-scrollbar">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 text-[#1a1a1a] dark:border-white/10 dark:bg-white/[0.03] dark:text-white/90">
              build a personal finance dashboard: net worth, monthly spend, income, and a recent
              transactions list. pull data from cobalt mcp.
            </div>
            <div className="text-[12px] text-[#1a1a1a]/55 dark:text-white/55">
              Read <span className="text-[#1a1a1a]/80 dark:text-white/85">cobalt-mcp-spec.md</span>
            </div>
            <div className="text-[12px] text-[#1a1a1a]/55 dark:text-white/55">
              Called <span className="text-[#1a1a1a]/80 dark:text-white/85">cobalt.net_worth</span>{" "}
              ·{" "}
              <span className="text-[#1a1a1a]/80 dark:text-white/85">cobalt.spending_summary</span>
            </div>
            <div className="text-[12px] text-[#1a1a1a]/55 dark:text-white/55">
              Thought <span className="text-[#1a1a1a]/40 dark:text-white/40">12s</span>
            </div>
            <div className="text-[#1a1a1a]/90 dark:text-white/90">
              I'll scaffold <span className="font-mono text-[12px]">/dashboard</span> with KPI cards
              on top, a 7-month spend chart, and a recent transactions table. Wiring data through{" "}
              <span className="font-mono text-[12px]">@cobalt/mcp</span>.
            </div>

            {[
              { add: "+214", del: "−0", file: "app/dashboard/page.tsx" },
              { add: "+68", del: "−4", file: "lib/cobalt/queries.ts" },
              { add: "+42", del: "−0", file: "components/kpi-card.tsx" },
            ].map((d) => (
              <div
                className="flex items-center gap-2 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-[12px] dark:border-white/10 dark:bg-white/[0.03]"
                key={d.file}
              >
                <span className="text-[#1a1a1a]/40 dark:text-white/40">📄</span>
                <span className="truncate text-[#1a1a1a]/85 dark:text-white/85">{d.file}</span>
                <span className="ml-auto text-emerald-600 dark:text-emerald-400">{d.add}</span>
                <span className="text-rose-600 dark:text-rose-400">{d.del}</span>
              </div>
            ))}

            <div className="text-[#1a1a1a]/90 dark:text-white/90">
              Done. Dashboard live at <span className="font-mono text-[12px]">/dashboard</span>. Net
              worth $184,302 (+2.3%), monthly spend $3,840 (−14% MoM). Spend chart pulls last 7
              months from <span className="font-mono text-[12px]">cobalt.spending_summary</span>.
              Transactions stream live from Plaid.
            </div>
          </div>

          {/* Composer input */}
          <div className="p-3">
            <div className="rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
              <input
                className="w-full bg-transparent text-[13px] text-[#1a1a1a] outline-none placeholder:text-[#1a1a1a]/40 dark:text-white dark:placeholder:text-white/40"
                placeholder="Plan, search, build anything..."
                readOnly
              />
              <div className="mt-2 flex items-center gap-2 text-[11px] text-[#1a1a1a]/55 dark:text-white/55">
                <span className="flex items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 dark:border-white/10">
                  ∞ Agent ▾
                </span>
                <span className="flex items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 dark:border-white/10">
                  Composer 2 ▾
                </span>
                <span className="ml-auto flex size-6 items-center justify-center rounded-full bg-[#1a1a1a]/10 dark:bg-white/10">
                  ↑
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Right: browser preview */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-black/5 px-3 py-2.5 text-[12px] text-[#1a1a1a]/55 dark:border-white/5 dark:text-white/55">
            <span className="opacity-60">←</span>
            <span className="opacity-60">→</span>
            <span className="opacity-60">↻</span>
            <div className="ml-1 flex-1 truncate rounded-md bg-black/[0.04] px-2 py-1 font-mono text-[11px] text-[#1a1a1a]/70 dark:bg-white/[0.06] dark:text-white/70">
              http://localhost:3010/dashboard
            </div>
            <span className="opacity-60">⊟</span>
          </div>

          <div className="relative flex-1 overflow-y-auto bg-background px-5 pt-5 pb-5 no-scrollbar">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Overview · Nov
                </div>
                <div className="font-display text-[26px] text-foreground italic">
                  Hey Rust, here's where you stand
                </div>
              </div>
              <Badge variant="secondary">November 2026</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {KPI.map((k) => (
                <Card className="py-3" key={k.label}>
                  <CardContent className="px-3">
                    <div className="text-[11px] text-muted-foreground">{k.label}</div>
                    <div className="mt-0.5 font-semibold text-[20px] text-foreground tabular-nums">
                      {k.val}
                    </div>
                    <div
                      className={`text-[11px] tabular-nums ${k.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                    >
                      {k.delta}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-4 py-4">
              <CardContent className="px-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[12px] font-medium text-foreground">
                    Spend · last 7 months
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Avg $4,860 · Peak $6,080 (Aug)
                  </div>
                </div>
                <div className="h-[120px]">
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart data={SPEND_BARS} margin={{ bottom: 0, left: 0, right: 0, top: 6 }}>
                      <XAxis
                        axisLine={false}
                        dataKey="m"
                        tick={{ fill: "currentColor", fontSize: 10, opacity: 0.45 }}
                        tickLine={false}
                      />
                      <Bar dataKey="v" radius={4}>
                        {SPEND_BARS.map((b) => (
                          <Cell
                            fill={b.active ? "var(--color-primary, #d4a017)" : "currentColor"}
                            fillOpacity={b.active ? 1 : 0.15}
                            key={b.m}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12px] font-medium text-foreground">Recent Transactions</div>
                <Button className="h-7 px-2 text-[11px]" size="sm" variant="ghost">
                  View all →
                </Button>
              </div>
              <Card className="py-0">
                <CardContent className="px-0">
                  {RECENT_TX.map((t, i) => (
                    <div
                      className={`flex items-center gap-3 px-3 py-2 ${i === 0 ? "" : "border-t"}`}
                      key={`${t.merchant}-${i}`}
                    >
                      <MerchantLogo
                        className="size-7"
                        counterparties={null}
                        logoUrl={null}
                        merchantName={t.merchant}
                        website={t.website || null}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] text-foreground">{t.merchant}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {t.cat} · {t.day}
                        </div>
                      </div>
                      <div
                        className={`text-[12px] tabular-nums ${
                          t.pos ? "text-emerald-600 dark:text-emerald-400" : "text-foreground/85"
                        }`}
                      >
                        {t.amt}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

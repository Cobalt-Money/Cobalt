import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import {
  BatteryCharging01Icon,
  CreditCardIcon,
  Home01Icon,
  MediumSignalIcon,
  Message01Icon,
  Notification01Icon,
  Search01Icon,
  Wifi02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const POSITIONS = [
  { pct: "44.41%", sym: "MNKD" },
  { pct: "100.00%", sym: "SPAXX" },
  { pct: "22.98%", sym: "TSLA" },
  { pct: "72.68%", sym: "NVDA" },
  { pct: "56.10%", sym: "GOOG" },
  { pct: "31.24%", sym: "AAPL" },
];

const RANGES = ["1W", "1M", "3M", "6M", "1Y", "All"] as const;

const RECENT = [
  { action: "Buy", amt: "−$284.30", day: "Today", qty: "+2 sh", sym: "NVDA" },
  { action: "Sell", amt: "+$242.10", day: "Today", pos: true, qty: "−1 sh", sym: "TSLA" },
  { action: "Dividend", amt: "+$18.42", day: "Yesterday", pos: true, qty: "", sym: "SPAXX" },
  { action: "Buy", amt: "−$112.40", day: "Yesterday", qty: "+5 sh", sym: "MNKD" },
];

export function MobileSection() {
  return (
    <section className="border-t px-6 py-24 lg:py-32">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-16 text-center">
        {/* Phone */}
        <div className="relative order-2 mx-auto flex justify-center">
          <div className="relative">
            {/* iPhone frame */}
            <div className="relative h-[640px] w-[310px] rounded-[52px] bg-[#ededed] p-[8px] shadow-2xl ring-1 ring-black/10 dark:bg-[#0f0f0f] dark:ring-white/10">
              <div className="absolute top-4 left-1/2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
              <div className="relative h-full w-full overflow-hidden rounded-[44px] bg-white text-[#1a1a1a] dark:bg-[#191919] dark:text-white">
                {/* Status bar */}
                <div className="flex items-center justify-between px-7 pt-3 text-[11px] font-semibold">
                  <span className="pl-2 text-[12px] leading-none">1:13</span>
                  <span className="flex items-center gap-1.5 opacity-80">
                    <HugeiconsIcon icon={MediumSignalIcon} size={14} strokeWidth={2} />
                    <HugeiconsIcon icon={Wifi02Icon} size={14} strokeWidth={2} />
                    <HugeiconsIcon icon={BatteryCharging01Icon} size={14} strokeWidth={2} />
                  </span>
                </div>

                {/* Account-type tabs */}
                <div className="mt-3 flex items-center gap-4 overflow-hidden px-2 text-[14px]">
                  <span className="text-[#1a1a1a]/35 dark:text-white/35">edit</span>
                  <span className="text-[#1a1a1a]/50 dark:text-white/55">Debit</span>
                  <span className="rounded-full border border-black/10 dark:border-white/15 bg-black/[0.04] dark:bg-white/[0.08] px-4 py-1 font-medium text-[#1a1a1a] dark:text-white shadow-inner shadow-black/5 dark:shadow-white/5 backdrop-blur-md">
                    Brokerage
                  </span>
                  <span className="text-[#1a1a1a]/50 dark:text-white/55">Net Worth</span>
                </div>

                {/* Balance */}
                <div className="mt-6 text-center">
                  <div className="flex items-baseline justify-center font-semibold tabular-nums">
                    <span className="text-[30px] leading-none">$126,891</span>
                    <span className="text-[11px] text-[#1a1a1a]/40 dark:text-white/40">.99</span>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    <span>-9.08%</span>
                    <span className="text-rose-600/80 dark:text-rose-400/80">($12,675.53)</span>
                  </div>
                </div>

                {/* Chart */}
                <div className="relative mt-2 h-[170px]">
                  <svg
                    className="h-full w-full"
                    fill="none"
                    preserveAspectRatio="none"
                    viewBox="0 0 310 170"
                  >
                    <path
                      d="M0 60 C 30 60, 50 65, 65 75 S 100 130, 130 130 S 175 122, 195 130 S 240 152, 270 150 S 305 145, 310 145"
                      stroke="currentColor"
                      className="text-[#1a1a1a] dark:text-white"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>

                {/* Range pills */}
                <div className="flex items-center justify-around px-3 text-[13px] text-[#1a1a1a]/55 dark:text-white/60">
                  {RANGES.map((r, i) => (
                    <span
                      className={
                        i === 0
                          ? "flex size-8 items-center justify-center rounded-full bg-black/[0.08] text-[#1a1a1a] dark:bg-white/10 dark:text-white"
                          : ""
                      }
                      key={r}
                    >
                      {r}
                    </span>
                  ))}
                </div>

                {/* Positions */}
                <div className="mt-4 flex items-center justify-between px-4">
                  <span className="text-[15px] font-semibold">Positions</span>
                  <span className="text-[#1a1a1a]/50 dark:text-white/55">›</span>
                </div>
                <div className="mt-2 flex gap-3 overflow-hidden px-4">
                  {POSITIONS.map((p) => (
                    <div className="flex flex-col items-center" key={p.sym}>
                      <TickerLogo className="size-8" size={32} symbol={p.sym} />
                      <div className="mt-1 text-[10px] font-semibold tracking-tight">{p.sym}</div>
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-400">
                        ↗{p.pct}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent activity */}
                <div className="mt-4 flex items-center justify-between px-4">
                  <span className="text-[15px] font-semibold">Recent Activity</span>
                  <span className="text-[#1a1a1a]/50 dark:text-white/55">›</span>
                </div>
                <div className="mt-2 space-y-2 px-4">
                  {RECENT.map((r, i) => (
                    <div className="flex items-center gap-3" key={`${r.sym}-${i}`}>
                      <TickerLogo className="size-7" size={28} symbol={r.sym} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium">
                          {r.action} {r.sym}
                        </div>
                        <div className="text-[10px] text-[#1a1a1a]/45 dark:text-white/45">
                          {r.qty ? `${r.qty} · ` : ""}
                          {r.day}
                        </div>
                      </div>
                      <div
                        className={`text-[12px] tabular-nums ${
                          r.pos
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-[#1a1a1a]/85 dark:text-white/85"
                        }`}
                      >
                        {r.amt}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fade overlay above nav */}
                <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-20 h-32 bg-gradient-to-b from-transparent via-white/70 to-white dark:via-[#191919]/70 dark:to-[#191919]" />

                {/* Bottom tab pill */}
                <div className="absolute right-5 bottom-4 left-5 z-30 flex items-center gap-2">
                  <div className="flex flex-1 items-center justify-around rounded-full bg-[#ececec] dark:bg-[#292929] px-1.5 py-1 text-[#1a1a1a]/50 dark:text-white/55">
                    <span className="flex h-7 w-10 items-center justify-center rounded-full bg-[#dcdcdc] text-[#1a1a1a] dark:bg-[#383838] dark:text-white">
                      <HugeiconsIcon icon={Home01Icon} size={19} strokeWidth={2} />
                    </span>
                    <HugeiconsIcon icon={CreditCardIcon} size={19} strokeWidth={2} />
                    <HugeiconsIcon icon={Notification01Icon} size={19} strokeWidth={2} />
                    <HugeiconsIcon icon={Search01Icon} size={19} strokeWidth={2} />
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-full bg-[#ececec] dark:bg-[#292929] text-[#1a1a1a]/50 dark:text-white/55">
                    <HugeiconsIcon
                      className="-translate-x-px"
                      icon={Message01Icon}
                      size={19}
                      strokeWidth={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="order-1 flex flex-col items-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Your money,
            <br />
            in your pocket.
          </h2>
          <div className="mt-8">
            <a
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 font-semibold text-background hover:opacity-90"
              href="https://apps.apple.com/app/id6757945133"
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.05 12.04c-.03-3.02 2.47-4.47 2.58-4.54-1.41-2.06-3.6-2.34-4.38-2.37-1.86-.19-3.64 1.1-4.59 1.1-.96 0-2.41-1.07-3.97-1.04-2.04.03-3.93 1.19-4.98 3.01-2.13 3.69-.54 9.13 1.53 12.12 1.01 1.46 2.21 3.1 3.78 3.04 1.52-.06 2.1-.98 3.94-.98 1.83 0 2.36.98 3.97.95 1.64-.03 2.68-1.49 3.68-2.96 1.16-1.69 1.64-3.34 1.66-3.42-.04-.01-3.18-1.22-3.22-4.85zM14.04 3.18c.83-1.01 1.39-2.41 1.23-3.81-1.2.05-2.65.8-3.5 1.8-.76.88-1.43 2.29-1.25 3.66 1.34.1 2.7-.68 3.52-1.65z" />
              </svg>
              <span>Download</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

import { LogoCDN } from "@cobalt-web/ui/cobalt/logos/logo-cdn";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AppleStocksIcon,
  ArrowReloadHorizontalIcon,
  Calendar02Icon,
  CreditCardIcon,
  Home04Icon,
  NewsIcon,
  Search02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";

type IconSvg = Parameters<typeof HugeiconsIcon>[0]["icon"];

const NAV: { icon: IconSvg; label: string; active?: boolean }[] = [
  { icon: Home04Icon, label: "Home" },
  { active: true, icon: CreditCardIcon, label: "Accounts" },
  { icon: AppleStocksIcon, label: "Brokerage" },
  { icon: Search02Icon, label: "Research" },
  { icon: ArrowReloadHorizontalIcon, label: "Transactions" },
  { icon: Calendar02Icon, label: "Subscriptions" },
  { icon: NewsIcon, label: "News" },
];

const BRANDFETCH_CLIENT_ID = process.env.VITE_BRANDFETCH_CLIENT_ID || "";

const SECTIONS: {
  institution: string;
  domain: string;
  accounts: { name: string; mask: string; balance: string }[];
}[] = [
  {
    accounts: [
      { balance: "$12,840.22", mask: "•• 4421", name: "Sapphire Checking" },
      { balance: "-$842.10", mask: "•• 1108", name: "Freedom Unlimited" },
    ],
    domain: "chase.com",
    institution: "Chase",
  },
  {
    accounts: [{ balance: "$48,120.55", mask: "•• 7732", name: "Brokerage" }],
    domain: "schwab.com",
    institution: "Schwab",
  },
];

const DIALOG_BANKS: { name: string; domain: string }[] = [
  { domain: "chase.com", name: "Chase" },
  { domain: "bankofamerica.com", name: "Bank of America" },
  { domain: "wellsfargo.com", name: "Wells Fargo" },
  { domain: "capitalone.com", name: "Capital One" },
  { domain: "citi.com", name: "Citi" },
  { domain: "americanexpress.com", name: "Amex" },
  { domain: "apple.com", name: "Apple Card" },
  { domain: "schwab.com", name: "Schwab" },
  { domain: "fidelity.com", name: "Fidelity" },
  { domain: "robinhood.com", name: "Robinhood" },
  { domain: "discover.com", name: "Discover" },
  { domain: "usaa.com", name: "USAA" },
];

export function ConnectPreview() {
  return (
    <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-background text-left shadow-lg">
      <div className="flex items-center gap-1.5 border-border border-b bg-muted/40 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
      </div>
      <div className="flex">
        <aside className="flex w-32 shrink-0 flex-col gap-0.5 border-border border-r bg-muted/20 p-1.5">
          <div className="mb-1 flex items-center gap-1.5 px-1.5 py-1">
            <div className="size-5 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-violet-500" />
            <span className="truncate font-medium text-[11px]">You</span>
          </div>
          {NAV.map((n) => (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px]",
                n.active ? "bg-foreground/10 text-foreground" : "text-foreground/60",
              )}
              key={n.label}
            >
              <HugeiconsIcon
                aria-hidden
                className="size-3 shrink-0"
                icon={n.icon}
                strokeWidth={1.5}
              />
              <span className="truncate">{n.label}</span>
            </div>
          ))}
        </aside>
        <div className="flex flex-1 flex-col gap-5 p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Accounts</span>
            <motion.span
              animate={{
                backgroundColor: [
                  "rgba(255,255,255,0)",
                  "rgba(255,255,255,0)",
                  "rgba(120,120,120,0.25)",
                  "rgba(255,255,255,0)",
                  "rgba(255,255,255,0)",
                ],
                scale: [1, 1, 0.92, 1, 1],
              }}
              transition={{
                duration: 4,
                ease: "easeInOut",
                repeat: Infinity,
                times: [0, 0.55, 0.62, 0.7, 1],
              }}
              className="rounded-md border border-foreground/20 bg-foreground/5 px-2 py-1 text-xs"
            >
              + Connect
            </motion.span>
          </div>
          {SECTIONS.map((s, i) => (
            <section className="flex flex-col gap-2" key={s.institution}>
              <div className="flex items-center gap-2">
                <LogoCDN
                  className="size-6 shrink-0 overflow-hidden rounded-full bg-muted"
                  clientId={BRANDFETCH_CLIENT_ID}
                  domain={s.domain}
                  fallbackText={s.institution[0] ?? ""}
                  logoApiSize={64}
                />
                <h2 className="font-semibold text-sm">{s.institution}</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {s.accounts.map((a) => (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-lg border border-border p-2.5",
                      i === 0 && a === s.accounts[0] ? "animate-pulse border-foreground/50" : "",
                    )}
                    key={a.name}
                  >
                    <LogoCDN
                      className="size-7 shrink-0 overflow-hidden rounded-md bg-muted"
                      clientId={BRANDFETCH_CLIENT_ID}
                      domain={s.domain}
                      fallbackText={s.institution[0] ?? ""}
                      logoApiSize={64}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-medium text-xs">{a.name}</span>
                      <span className="text-[10px] text-muted-foreground">{a.mask}</span>
                    </div>
                    <span className="font-semibold text-foreground text-xs">{a.balance}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <motion.div
        animate={{
          left: ["20%", "20%", "88%", "88%", "88%"],
          opacity: [0, 1, 1, 1, 1],
          scale: [1, 1, 1, 0.85, 1],
          top: ["88%", "88%", "18%", "18%", "18%"],
        }}
        transition={{
          duration: 4,
          ease: "easeInOut",
          repeat: Infinity,
          times: [0, 0.1, 0.55, 0.65, 1],
        }}
        className="pointer-events-none absolute z-20 -translate-x-1 -translate-y-1"
      >
        <svg
          className="size-6 text-primary drop-shadow"
          viewBox="0 0 40 40"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="currentColor"
            d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
          />
        </svg>
      </motion.div>

      <motion.div
        animate={{ opacity: [0, 0, 0, 1, 1] }}
        transition={{
          duration: 4,
          ease: "easeInOut",
          repeat: Infinity,
          times: [0, 0.6, 0.65, 0.7, 1],
        }}
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      >
        <div className="flex h-[72%] w-[62%] max-w-xs flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl">
          <div className="border-border border-b px-3 py-2 text-muted-foreground text-[11px]">
            Search banks, cards, and brokerages...
          </div>
          <div className="flex min-h-0">
            <nav className="flex w-20 shrink-0 flex-col gap-0.5 p-2">
              {["All", "Banks", "Brokerage", "Cash"].map((f, i) => (
                <span
                  className={cn(
                    "rounded-md px-2 py-1 text-left font-medium text-[10px]",
                    i === 0 ? "bg-input/40 text-foreground" : "text-muted-foreground",
                  )}
                  key={f}
                >
                  {f}
                </span>
              ))}
            </nav>
            <div className="grid flex-1 grid-cols-3 gap-x-3 gap-y-4 p-3">
              {DIALOG_BANKS.slice(0, 9).map((b) => (
                <div className="flex flex-col items-center gap-0.5" key={b.name}>
                  <LogoCDN
                    className="size-6 overflow-hidden rounded-lg bg-muted"
                    clientId={BRANDFETCH_CLIENT_ID}
                    domain={b.domain}
                    fallbackText={b.name[0] ?? ""}
                    logoApiSize={48}
                  />
                  <span className="line-clamp-2 text-center text-[8px] leading-tight text-foreground/80">
                    {b.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

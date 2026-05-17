import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { LogoCDN } from "@cobalt-web/ui/cobalt/logos/logo-cdn";
import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { useState } from "react";
import type { ReactNode } from "react";

type CommandId =
  | "transactions"
  | "net-worth"
  | "spending"
  | "subscriptions"
  | "holdings"
  | "search-merchant"
  | "connect-account";

interface Command {
  id: CommandId;
  title: string;
  subtitle: string;
  kind: "Command" | "Action";
  icon: ReactNode;
  section: "Suggestions" | "Commands";
}

const COBALT_ICON = (
  <div className="flex size-6 items-center justify-center rounded bg-black text-[12px] font-bold text-[#d4a017]">
    C
  </div>
);

const COMMANDS: Command[] = [
  {
    icon: COBALT_ICON,
    id: "transactions",
    kind: "Command",
    section: "Suggestions",
    subtitle: "Cobalt",
    title: "Recent Transactions",
  },
  {
    icon: COBALT_ICON,
    id: "net-worth",
    kind: "Command",
    section: "Suggestions",
    subtitle: "Cobalt",
    title: "Net Worth",
  },
  {
    icon: COBALT_ICON,
    id: "spending",
    kind: "Command",
    section: "Suggestions",
    subtitle: "Cobalt",
    title: "Spending by Category",
  },
  {
    icon: COBALT_ICON,
    id: "subscriptions",
    kind: "Command",
    section: "Commands",
    subtitle: "Cobalt",
    title: "Active Subscriptions",
  },
  {
    icon: COBALT_ICON,
    id: "holdings",
    kind: "Command",
    section: "Commands",
    subtitle: "Cobalt",
    title: "Top Holdings",
  },
  {
    icon: COBALT_ICON,
    id: "search-merchant",
    kind: "Command",
    section: "Commands",
    subtitle: "Cobalt",
    title: "Search Merchants",
  },
  {
    icon: COBALT_ICON,
    id: "connect-account",
    kind: "Action",
    section: "Commands",
    subtitle: "Cobalt · Plaid",
    title: "Connect Account",
  },
];

const TRANSACTIONS = [
  {
    amt: "−$84.20",
    category: "Groceries",
    day: "Today",
    merchant: "Whole Foods",
    website: "wholefoodsmarket.com",
  },
  { amt: "−$18.40", category: "Transit", day: "Today", merchant: "Uber", website: "uber.com" },
  {
    amt: "−$6.50",
    category: "Food & Drink",
    day: "Yesterday",
    merchant: "Blue Bottle Coffee",
    website: "bluebottlecoffee.com",
  },
  {
    amt: "+$4,210.00",
    category: "Income",
    day: "Yesterday",
    merchant: "Payroll · Acme Inc.",
    pos: true,
    website: "",
  },
  {
    amt: "−$15.49",
    category: "Subscription",
    day: "2d",
    merchant: "Netflix",
    website: "netflix.com",
  },
  { amt: "−$127.83", category: "Shopping", day: "3d", merchant: "Amazon", website: "amazon.com" },
  {
    amt: "−$10.99",
    category: "Subscription",
    day: "3d",
    merchant: "Spotify",
    website: "spotify.com",
  },
  {
    amt: "−$62.41",
    category: "Groceries",
    day: "4d",
    merchant: "Trader Joe's",
    website: "traderjoes.com",
  },
];

const HOLDINGS = [
  { name: "NVIDIA", pct: "+1.8%", pos: true, sym: "NVDA", val: "$48,210" },
  { name: "Apple", pct: "+0.4%", pos: true, sym: "AAPL", val: "$22,940" },
  { name: "Vanguard Total Market", pct: "+0.2%", pos: true, sym: "VTI", val: "$31,402" },
  { name: "Tesla", pct: "−2.1%", pos: false, sym: "TSLA", val: "$12,830" },
  { name: "Microsoft", pct: "+0.7%", pos: true, sym: "MSFT", val: "$18,560" },
];

const SUBS = [
  { name: "Netflix", next: "Nov 12", price: "$15.49/mo" },
  { name: "Spotify", next: "Nov 14", price: "$10.99/mo" },
  { flag: "Unused 60d", name: "Adobe Creative Cloud", next: "Nov 18", price: "$54.99/mo" },
  { name: "iCloud+", next: "Nov 20", price: "$2.99/mo" },
  { flag: "Unused 90d", name: "Planet Fitness", next: "Nov 22", price: "$59.99/mo" },
];

const SPENDING = [
  { amt: "$612", cat: "Groceries", pct: 22 },
  { amt: "$487", cat: "Restaurants", pct: 18 },
  { amt: "$284", cat: "Transit", pct: 10 },
  { amt: "$201", cat: "Subscriptions", pct: 7 },
  { amt: "$178", cat: "Shopping", pct: 6 },
];

// Theme tokens — light default, dark via .dark variant
const TXT_STRONG = "text-[#1a1a1a] dark:text-white";
const TXT = "text-[#1a1a1a]/85 dark:text-white/90";
const TXT_MUTED = "text-[#1a1a1a]/55 dark:text-white/60";
const TXT_DIM = "text-[#1a1a1a]/40 dark:text-white/40";
const TXT_FAINT = "text-[#1a1a1a]/30 dark:text-white/35";
const BG_ROW_HOVER = "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]";
const BG_ROW_ACTIVE = "bg-black/[0.06] dark:bg-white/[0.06]";
const BG_CHIP = "bg-black/[0.04] dark:bg-white/[0.06]";
const BORDER = "border-black/10 dark:border-white/10";
const DIVIDER = "bg-black/[0.06] dark:bg-white/5";

function RaycastRow({
  icon,
  title,
  subtitle,
  kind,
  active,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  kind: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${BG_ROW_HOVER} ${
        active ? BG_ROW_ACTIVE : ""
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex size-6 flex-shrink-0 items-center justify-center overflow-hidden rounded">
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={`truncate text-[13px] ${TXT}`}>{title}</span>
        {subtitle && <span className={`truncate text-[12px] ${TXT_DIM}`}>{subtitle}</span>}
      </div>
      <span className={`text-[12px] ${TXT_DIM}`}>{kind}</span>
    </button>
  );
}

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className={`flex items-center gap-3 border-b px-4 py-3 ${BORDER}`}>
      <button
        className={`flex size-6 items-center justify-center rounded-md ${TXT_MUTED} ${BG_ROW_HOVER}`}
        onClick={onBack}
        type="button"
      >
        ←
      </button>
      <div className={`text-[13px] ${TXT}`}>{title}</div>
      <div className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
        <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
        Cobalt
      </div>
    </div>
  );
}

function TransactionsDetail({ onBack }: { onBack: () => void }) {
  return (
    <>
      <DetailHeader onBack={onBack} title="Recent Transactions" />
      <div className="max-h-[440px] overflow-y-auto px-2 py-2 no-scrollbar">
        {TRANSACTIONS.map((t, i) => (
          <div
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 ${i === 0 ? BG_ROW_ACTIVE : ""}`}
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
              <div className={`truncate text-[13px] ${TXT}`}>{t.merchant}</div>
              <div className={`text-[11px] ${TXT_DIM}`}>
                {t.category} · {t.day}
              </div>
            </div>
            <div
              className={`text-[13px] tabular-nums ${t.pos ? "text-emerald-600 dark:text-emerald-400" : TXT_STRONG}`}
            >
              {t.amt}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function NetWorthDetail({ onBack }: { onBack: () => void }) {
  return (
    <>
      <DetailHeader onBack={onBack} title="Net Worth" />
      <div className="px-6 py-6">
        <div className={`text-[11px] uppercase tracking-wider ${TXT_DIM}`}>Total</div>
        <div className={`mt-1 font-semibold text-[36px] tabular-nums ${TXT_STRONG}`}>
          $184,302.55
        </div>
        <div className="text-[13px] text-emerald-600 dark:text-emerald-400">
          +$4,210 (2.3%) vs last month
        </div>
        <div className="mt-6 space-y-2">
          {[
            { label: "Cash & Checking", val: "$12,840" },
            { label: "Brokerage · Fidelity", val: "$108,210" },
            { label: "Brokerage · Robinhood", val: "$24,920" },
            { label: "Crypto", val: "$5,402" },
            { label: "Credit Cards", val: "−$2,070" },
          ].map((r) => (
            <div
              className={`flex items-center justify-between rounded-md px-3 py-2 text-[13px] bg-black/[0.03] dark:bg-white/[0.03]`}
              key={r.label}
            >
              <span className={TXT_MUTED}>{r.label}</span>
              <span className={`tabular-nums ${TXT}`}>{r.val}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function SpendingDetail({ onBack }: { onBack: () => void }) {
  return (
    <>
      <DetailHeader onBack={onBack} title="Spending by Category — Oct" />
      <div className="px-4 py-4">
        {SPENDING.map((s) => (
          <div className="mb-3" key={s.cat}>
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className={TXT}>{s.cat}</span>
              <span className={`tabular-nums ${TXT}`}>{s.amt}</span>
            </div>
            <div className={`h-1.5 overflow-hidden rounded-full ${BG_CHIP}`}>
              <div
                className="h-full rounded-full bg-[#d4a017]"
                style={{ width: `${s.pct * 4}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SubscriptionsDetail({ onBack }: { onBack: () => void }) {
  return (
    <>
      <DetailHeader onBack={onBack} title="Active Subscriptions" />
      <div className="max-h-[440px] overflow-y-auto px-2 py-2 no-scrollbar">
        {SUBS.map((s) => (
          <div
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 ${BG_ROW_HOVER}`}
            key={s.name}
          >
            <div
              className={`flex size-7 items-center justify-center rounded-md text-[11px] ${BG_CHIP} ${TXT_MUTED}`}
            >
              {s.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className={`truncate text-[13px] ${TXT}`}>{s.name}</div>
              <div className={`text-[11px] ${TXT_DIM}`}>Next charge {s.next}</div>
            </div>
            {s.flag && (
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                {s.flag}
              </span>
            )}
            <div className={`text-[13px] tabular-nums ${TXT}`}>{s.price}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function HoldingsDetail({ onBack }: { onBack: () => void }) {
  return (
    <>
      <DetailHeader onBack={onBack} title="Top Holdings" />
      <div className="max-h-[440px] overflow-y-auto px-2 py-2 no-scrollbar">
        {HOLDINGS.map((h) => (
          <div
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 ${BG_ROW_HOVER}`}
            key={h.sym}
          >
            <TickerLogo className="size-7" size={28} symbol={h.sym} />
            <div className="min-w-0 flex-1">
              <div className={`truncate text-[13px] ${TXT}`}>{h.sym}</div>
              <div className={`truncate text-[11px] ${TXT_DIM}`}>{h.name}</div>
            </div>
            <div className="text-right">
              <div className={`text-[13px] tabular-nums ${TXT}`}>{h.val}</div>
              <div
                className={`text-[11px] tabular-nums ${h.pos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
              >
                {h.pct}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PlaceholderDetail({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <>
      <DetailHeader onBack={onBack} title={title} />
      <div className={`px-6 py-10 text-center text-[13px] ${TXT_DIM}`}>
        Connect an account to see this view.
      </div>
    </>
  );
}

function FooterPill({ primary }: { primary: string }) {
  return (
    <div className="pointer-events-none absolute right-3 bottom-3 left-3 flex items-center justify-between">
      <div
        className={`flex size-9 items-center justify-center rounded-full border bg-white/90 dark:bg-[#1f1f1f]/90 shadow-lg backdrop-blur ${BORDER} ${TXT_MUTED}`}
      >
        <svg fill="none" height="14" viewBox="0 0 24 24" width="14">
          <path
            d="M4 8h16M4 12h16M4 16h10"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      </div>
      <div
        className={`flex items-center gap-1 rounded-full border bg-white/90 dark:bg-[#1f1f1f]/90 px-3 py-1.5 text-[12px] shadow-lg backdrop-blur ${BORDER} ${TXT_MUTED}`}
      >
        <span className="px-1.5">{primary}</span>
        <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${BG_CHIP}`}>↵</span>
        <span className={`mx-1 h-3 w-px ${DIVIDER}`} />
        <span className="px-1.5">Actions</span>
        <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${BG_CHIP}`}>⌘</span>
        <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${BG_CHIP}`}>K</span>
      </div>
    </div>
  );
}

export function RaycastVisual() {
  const [selected, setSelected] = useState<CommandId | null>(null);
  const [highlighted, setHighlighted] = useState<CommandId>("transactions");
  const [query, setQuery] = useState("");

  const filtered = COMMANDS.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));
  const suggestions = filtered.filter((c) => c.section === "Suggestions");
  const commands = filtered.filter((c) => c.section === "Commands");

  const back = () => setSelected(null);

  const renderDetail = () => {
    switch (selected) {
      case "transactions": {
        return <TransactionsDetail onBack={back} />;
      }
      case "net-worth": {
        return <NetWorthDetail onBack={back} />;
      }
      case "spending": {
        return <SpendingDetail onBack={back} />;
      }
      case "subscriptions": {
        return <SubscriptionsDetail onBack={back} />;
      }
      case "holdings": {
        return <HoldingsDetail onBack={back} />;
      }
      case "search-merchant": {
        return <PlaceholderDetail onBack={back} title="Search Merchants" />;
      }
      case "connect-account": {
        return <PlaceholderDetail onBack={back} title="Connect Account" />;
      }
      default: {
        return null;
      }
    }
  };

  return (
    <div
      className={`relative mx-auto w-full max-w-[760px] overflow-hidden rounded-[28px] border bg-white dark:bg-[#161616] backdrop-blur shadow-2xl ${BORDER}`}
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro', sans-serif" }}
    >
      {selected ? (
        <>
          {renderDetail()}
          <div className="h-16" />
          <FooterPill primary="Open Transaction" />
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex size-6 items-center justify-center">
              <LogoCDN
                className="size-6"
                clientId={process.env.VITE_BRANDFETCH_CLIENT_ID || ""}
                domain="raycast.com"
                fallbackText="R"
                imgClassName="size-6"
                logoApiSize={48}
              />
            </div>
            <input
              className={`flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#1a1a1a]/30 dark:placeholder:text-white/35 ${TXT_STRONG}`}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Cobalt commands..."
              value={query}
            />
            <div className={`flex items-center gap-1.5 text-[13px] ${TXT_DIM}`}>
              Quick AI
              <span className={`rounded border px-1.5 py-0.5 text-[11px] ${BORDER}`}>⇥</span>
            </div>
          </div>

          <div className="max-h-[440px] overflow-y-auto px-2 pb-2 pt-2 no-scrollbar">
            {suggestions.length > 0 && (
              <>
                <div className={`px-3 py-1.5 text-[11px] ${TXT_FAINT}`}>Suggestions</div>
                {suggestions.map((c) => (
                  <RaycastRow
                    active={highlighted === c.id}
                    icon={c.icon}
                    key={c.id}
                    kind={c.kind}
                    onClick={() => {
                      setHighlighted(c.id);
                      setSelected(c.id);
                    }}
                    subtitle={c.subtitle}
                    title={c.title}
                  />
                ))}
              </>
            )}
            {commands.length > 0 && (
              <>
                <div className={`mt-1 px-3 py-1.5 text-[11px] ${TXT_FAINT}`}>Commands</div>
                {commands.map((c) => (
                  <RaycastRow
                    active={highlighted === c.id}
                    icon={c.icon}
                    key={c.id}
                    kind={c.kind}
                    onClick={() => {
                      setHighlighted(c.id);
                      setSelected(c.id);
                    }}
                    subtitle={c.subtitle}
                    title={c.title}
                  />
                ))}
              </>
            )}
            {filtered.length === 0 && (
              <div className={`px-3 py-8 text-center text-[13px] ${TXT_DIM}`}>No results</div>
            )}
          </div>

          <div className="h-16" />

          <FooterPill primary="Open Command" />
        </>
      )}
    </div>
  );
}

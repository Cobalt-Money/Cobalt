import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { AccountsList } from "@cobalt-web/ui/cobalt/accounts/accounts-list";
import type {
  AccountCardViewModel,
  BrokerageRowWithRelations,
} from "@cobalt-web/ui/cobalt/accounts/lib/map-zero-to-account-cards";
import { BrokerageOverview } from "@cobalt-web/ui/cobalt/brokerage/brokerage-overview";
import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import type { FinancialEventCard } from "@cobalt-web/ui/cobalt/news/financial-events-feed";
import type { NewsMagazineSidebarItem } from "@cobalt-web/ui/cobalt/news/news-magazine";
import { NewsMagazine } from "@cobalt-web/ui/cobalt/news/news-magazine";
import { TransactionsTable } from "@cobalt-web/ui/cobalt/transactions/transactions-table";
import {
  Message,
  MessageContent,
} from "@cobalt-web/ui/components/ai-elements/message";
import { Kbd, KbdGroup } from "@cobalt-web/ui/components/kbd";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AppleStocksIcon,
  ArrowReloadHorizontalIcon,
  BellDotIcon,
  Calendar02Icon,
  CreditCardIcon,
  EyeIcon,
  Home04Icon,
  NewsIcon,
  PlusSignIcon,
  SearchDollarIcon,
  SearchIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { ChatPromptInput } from "@/components/ai-chat/chat-prompt-input";
import { DashboardInvestmentPerformanceCard } from "@/components/dashboard/dashboard-investment-performance-card";
import { DashboardRecentTransactionsCard } from "@/components/dashboard/dashboard-recent-transactions-card";
import { DashboardSubscriptionsCalendar } from "@/components/dashboard/dashboard-subscriptions-calendar";
import { NetWorthSection } from "@/components/dashboard/net-worth-section";
import { BabySubscriptionsCalendar } from "@/components/landing/baby/baby-subscriptions-calendar";
import type { ChartPeriod } from "@/components/research/lightweight-price-chart";
import { LightweightPriceChart } from "@/components/research/lightweight-price-chart";
import { mockChartPoints } from "@/components/research/ticker-detail-mock";
import { BrowserWindow } from "@/components/ui/mock-browser-window";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NavId =
  | "dashboard"
  | "accounts"
  | "brokerage"
  | "research"
  | "transactions"
  | "subscriptions"
  | "news"
  | "ai-chat";

// ---------------------------------------------------------------------------
// Mock data — Transactions
// ---------------------------------------------------------------------------

function makeTx(
  overrides: Partial<TransactionListItem> &
    Pick<TransactionListItem, "id" | "name" | "amount" | "date">
): TransactionListItem {
  return {
    accountName: "Chase Checking",
    accountType: "depository",
    authorizedDate: null,
    counterparties: null,
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "chase.com",
    location: null,
    logoUrl: null,
    merchantName: null,
    pending: false,
    personalFinanceCategory: null,
    plaidAccountId: "plaid-acc-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: null,
    ...overrides,
  };
}

const TRANSACTIONS: TransactionListItem[] = [
  makeTx({
    amount: -4.5,
    date: "2026-04-11",
    id: "tx-1",
    name: "Blue Bottle Coffee",
    personalFinanceCategory: {
      detailed: "FOOD_AND_DRINK_COFFEE",
      primary: "FOOD_AND_DRINK",
    },
    website: "bluebottlecoffee.com",
  }),
  makeTx({
    amount: -12.99,
    date: "2026-04-11",
    id: "tx-2",
    institutionName: "Fidelity",
    institutionUrl: "fidelity.com",
    name: "Spotify",
    personalFinanceCategory: {
      detailed: "ENTERTAINMENT_MUSIC_AND_AUDIO",
      primary: "ENTERTAINMENT",
    },
    website: "spotify.com",
  }),
  makeTx({
    amount: 3240,
    date: "2026-04-10",
    id: "tx-3",
    institutionName: "Chase",
    institutionUrl: "chase.com",
    name: "Payroll",
    personalFinanceCategory: { detailed: "INCOME_WAGES", primary: "INCOME" },
  }),
  makeTx({
    amount: -89,
    date: "2026-04-10",
    id: "tx-4",
    institutionName: "Apple",
    institutionUrl: "apple.com",
    name: "Amazon",
    personalFinanceCategory: {
      detailed: "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES",
      primary: "GENERAL_MERCHANDISE",
    },
    website: "amazon.com",
  }),
  makeTx({
    amount: -156.23,
    date: "2026-04-09",
    id: "tx-5",
    institutionName: "Wells Fargo",
    institutionUrl: "wellsfargo.com",
    name: "PG&E",
    personalFinanceCategory: {
      detailed: "HOME_IMPROVEMENT_UTILITIES",
      primary: "HOME_IMPROVEMENT",
    },
    website: "pge.com",
  }),
  makeTx({
    amount: -14.99,
    date: "2026-04-09",
    id: "tx-6",
    institutionName: "Chase",
    institutionUrl: "chase.com",
    name: "Netflix",
    personalFinanceCategory: {
      detailed: "ENTERTAINMENT_TV_AND_MOVIES",
      primary: "ENTERTAINMENT",
    },
    website: "netflix.com",
  }),
  makeTx({
    amount: -9.99,
    date: "2026-04-08",
    id: "tx-7",
    institutionName: "Apple",
    institutionUrl: "apple.com",
    name: "iCloud",
    personalFinanceCategory: {
      detailed: "GENERAL_SERVICES_SUBSCRIPTION",
      primary: "GENERAL_SERVICES",
    },
    website: "apple.com",
  }),
  makeTx({
    amount: -55,
    date: "2026-04-07",
    id: "tx-8",
    institutionName: "Chase",
    institutionUrl: "chase.com",
    name: "Nobu",
    personalFinanceCategory: {
      detailed: "FOOD_AND_DRINK_RESTAURANTS",
      primary: "FOOD_AND_DRINK",
    },
    website: "noburestaurants.com",
  }),
  makeTx({
    amount: -2400,
    date: "2026-03-31",
    id: "tx-9",
    institutionName: "Bank of America",
    institutionUrl: "bankofamerica.com",
    name: "March Rent",
    personalFinanceCategory: {
      detailed: "RENT_AND_UTILITIES_RENT",
      primary: "RENT_AND_UTILITIES",
    },
  }),
  makeTx({
    amount: -42.5,
    date: "2026-03-28",
    id: "tx-10",
    institutionName: "Chase",
    institutionUrl: "chase.com",
    name: "Trader Joe's",
    personalFinanceCategory: {
      detailed: "FOOD_AND_DRINK_GROCERIES",
      primary: "FOOD_AND_DRINK",
    },
    website: "traderjoes.com",
  }),
  makeTx({
    amount: -8.75,
    date: "2026-03-27",
    id: "tx-11",
    institutionName: "Wells Fargo",
    institutionUrl: "wellsfargo.com",
    name: "Uber",
    personalFinanceCategory: {
      detailed: "TRANSPORTATION_TAXI_AND_RIDESHARE",
      primary: "TRANSPORTATION",
    },
    website: "uber.com",
  }),
];

// ---------------------------------------------------------------------------
// Mock data — Accounts
// ---------------------------------------------------------------------------

const MOCK_ACCOUNTS: AccountCardViewModel[] = [
  {
    accountTypeLabel: "Checking",
    category: "banking",
    description: "Chase Total Checking",
    id: "mock-chase-checking",
    institution: "Chase",
    institutionLogo: null,
    institutionLogosExtra: null,
    institutionUrl: "chase.com",
    kind: "bank",
    lastSyncedAt: Date.now() - 1000 * 60 * 30,
    mask: "4821",
    plaidAccountId: "mock-plaid-1",
    plaidItemId: "mock-item-1",
    snaptradeAuthorizationId: null,
  },
  {
    accountTypeLabel: "Savings",
    category: "banking",
    description: "Chase Savings",
    id: "mock-chase-savings",
    institution: "Chase",
    institutionLogo: null,
    institutionLogosExtra: null,
    institutionUrl: "chase.com",
    kind: "bank",
    lastSyncedAt: Date.now() - 1000 * 60 * 30,
    mask: "2290",
    plaidAccountId: "mock-plaid-2",
    plaidItemId: "mock-item-1",
    snaptradeAuthorizationId: null,
  },
  {
    accountTypeLabel: "Credit Card",
    category: "credit",
    description: "Apple Card",
    id: "mock-apple-card",
    institution: "Apple Card",
    institutionLogo: null,
    institutionLogosExtra: null,
    institutionUrl: "apple.com",
    kind: "bank",
    lastSyncedAt: Date.now() - 1000 * 60 * 45,
    mask: "7712",
    plaidAccountId: "mock-plaid-3",
    plaidItemId: "mock-item-2",
    snaptradeAuthorizationId: null,
  },
  {
    accountTypeLabel: "Individual Taxable",
    category: "brokerage",
    description: "Fidelity Brokerage",
    id: "mock-fidelity",
    institution: "Fidelity",
    institutionLogo: null,
    institutionLogosExtra: null,
    institutionUrl: "fidelity.com",
    kind: "brokerage",
    lastSyncedAt: Date.now() - 1000 * 60 * 60 * 2,
    mask: "9934",
    plaidAccountId: null,
    plaidItemId: null,
    snaptradeAuthorizationId: "mock-snaptrade-1",
  },
];

// ---------------------------------------------------------------------------
// Mock data — Brokerage
// ---------------------------------------------------------------------------

const MOCK_BROKERAGE_ACCOUNTS: BrokerageRowWithRelations[] = [
  {
    accountId: "brok-acc-1",
    accountNumber: "****9934",
    accountType: "individual",
    balances: [
      {
        cash: 1250,
        currencyCode: "USD",
        lastSync: Date.now(),
        updatedAt: Date.now(),
      } as unknown as NonNullable<
        BrokerageRowWithRelations["balances"]
      >[number],
    ],
    brokerageAuthorization: {
      authorizationId: "auth-1",
      brokerage: "FIDELITY",
      brokerageSlug: "fidelity",
      meta: null,
      name: "Fidelity",
    },
    id: "brok-acc-1",
    institutionName: "Fidelity",
    metaData: null,
    name: "Fidelity Brokerage Account",
    portfolioGroup: null,
  },
];

type PositionRow = Parameters<typeof BrokerageOverview>[0]["positions"][number];
type ActivityRow = Parameters<
  typeof BrokerageOverview
>[0]["recentActivities"][number];

const MOCK_POSITIONS: PositionRow[] = [
  {
    averagePurchasePrice: 150,
    brokerageAccount: { id: "brok-acc-1", name: "Fidelity Brokerage Account" },
    currencyCode: "USD",
    id: "pos-aapl",
    lastSync: Date.now(),
    openPnl: 579.28,
    price: 198.44,
    securityTypeDescription: "Equity",
    symbol: "AAPL",
    symbolDescription: "Apple Inc.",
    units: 12,
  },
  {
    averagePurchasePrice: 620,
    brokerageAccount: { id: "brok-acc-1", name: "Fidelity Brokerage Account" },
    currencyCode: "USD",
    id: "pos-nvda",
    lastSync: Date.now(),
    openPnl: 1056.48,
    price: 884.12,
    securityTypeDescription: "Equity",
    symbol: "NVDA",
    symbolDescription: "NVIDIA Corp.",
    units: 4,
  },
  {
    averagePurchasePrice: 380,
    brokerageAccount: { id: "brok-acc-1", name: "Fidelity Brokerage Account" },
    currencyCode: "USD",
    id: "pos-msft",
    lastSync: Date.now(),
    openPnl: 258.88,
    price: 412.36,
    securityTypeDescription: "Equity",
    symbol: "MSFT",
    symbolDescription: "Microsoft Corp.",
    units: 8,
  },
  {
    averagePurchasePrice: 480,
    brokerageAccount: { id: "brok-acc-1", name: "Fidelity Brokerage Account" },
    currencyCode: "USD",
    id: "pos-voo",
    lastSync: Date.now(),
    openPnl: 972,
    price: 528.6,
    securityTypeDescription: "ETF",
    symbol: "VOO",
    symbolDescription: "Vanguard S&P 500 ETF",
    units: 20,
  },
];

const MOCK_ACTIVITIES: ActivityRow[] = [
  {
    amount: 1192,
    brokerageAccount: { id: "brok-acc-1", name: "Fidelity Brokerage Account" },
    id: "act-1",
    price: 198.44,
    symbolDescription: "Apple Inc.",
    symbolTicker: "AAPL",
    tradeDate: Date.now() - 86_400_000 * 3,
    type: "BUY",
  },
  {
    amount: 42.18,
    brokerageAccount: { id: "brok-acc-1", name: "Fidelity Brokerage Account" },
    id: "act-2",
    price: null,
    symbolDescription: "Vanguard S&P 500 ETF",
    symbolTicker: "VOO",
    tradeDate: Date.now() - 86_400_000 * 7,
    type: "DIVIDEND",
  },
  {
    amount: 3298.88,
    brokerageAccount: { id: "brok-acc-1", name: "Fidelity Brokerage Account" },
    id: "act-3",
    price: 412.36,
    symbolDescription: "Microsoft Corp.",
    symbolTicker: "MSFT",
    tradeDate: Date.now() - 86_400_000 * 14,
    type: "BUY",
  },
];

// ---------------------------------------------------------------------------
// Mock data — News
// ---------------------------------------------------------------------------

const MOCK_NEWS_EVENTS: FinancialEventCard[] = [
  {
    articles: [
      {
        id: "art-1",
        imageUrl: null,
        newsUrl: "https://www.bloomberg.com",
        sourceName: "Bloomberg",
        title: "Fed holds rates steady, signals patience on cuts",
      },
    ],
    createdAt: Date.now() - 1000 * 60 * 30,
    date: Date.now() - 1000 * 60 * 25,
    eventId: "evt-1",
    eventName: "Fed holds rates steady amid cooling inflation",
    eventText:
      "The Federal Reserve voted unanimously to keep the benchmark interest rate unchanged, citing easing inflation pressure and a resilient labor market.",
    id: "evt-1",
    newsItems: 8,
    sentiment: "neutral",
    summary:
      "The Federal Reserve voted to hold rates at the current target range, signaling a cautious approach as inflation trends toward the 2% target.",
    tickers: ["SPY", "QQQ"],
    topics: ["general", "government"],
  },
  {
    articles: [
      {
        id: "art-2",
        imageUrl: null,
        newsUrl: "https://www.wsj.com",
        sourceName: "WSJ",
        title: "Apple Q2 earnings: Services hit all-time high",
      },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    date: Date.now() - 1000 * 60 * 60 * 2,
    eventId: "evt-2",
    eventName: "Apple reports record Q2 services revenue of $26.6B",
    eventText:
      "Apple's services segment — App Store, iCloud, Apple Pay — posted its highest quarterly revenue on record, offsetting softer iPhone sales.",
    id: "evt-2",
    newsItems: 12,
    sentiment: "positive",
    summary:
      "Apple beat Wall Street estimates with $26.6B in services revenue, driving a 7% YoY revenue increase despite iPhone headwinds.",
    tickers: ["AAPL"],
    topics: ["general", "earnings", "tech"],
  },
  {
    articles: [
      {
        id: "art-3",
        imageUrl: null,
        newsUrl: "https://www.reuters.com",
        sourceName: "Reuters",
        title: "NVIDIA crosses $3 trillion market cap",
      },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    date: Date.now() - 1000 * 60 * 60 * 5,
    eventId: "evt-3",
    eventName: "NVIDIA surpasses $3T market cap on AI chip demand",
    eventText:
      "NVIDIA's market capitalization crossed $3 trillion for the first time as data center revenue surged 427% year-over-year on insatiable AI infrastructure demand.",
    id: "evt-3",
    newsItems: 15,
    sentiment: "positive",
    summary:
      "NVIDIA joined Apple and Microsoft in the $3T club as its H100 and Blackwell chips continue to dominate AI workloads globally.",
    tickers: ["NVDA"],
    topics: ["general", "tech", "ai"],
  },
  {
    articles: [
      {
        id: "art-4",
        imageUrl: null,
        newsUrl: "https://www.ft.com",
        sourceName: "FT",
        title: "March jobs report: 275K nonfarm payrolls added",
      },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    date: Date.now() - 1000 * 60 * 60 * 8,
    eventId: "evt-4",
    eventName: "Jobs report beats expectations with 275K new positions",
    eventText:
      "The U.S. economy added 275,000 jobs in March, well above the 200,000 consensus estimate. Unemployment held at 3.8%.",
    id: "evt-4",
    newsItems: 6,
    sentiment: "neutral",
    summary:
      "A stronger-than-expected labor market report pushed Treasury yields higher as markets recalibrated Fed rate-cut expectations.",
    tickers: [],
    topics: ["general", "government"],
  },
];

const MOCK_RSS_ITEMS: NewsMagazineSidebarItem[] = [
  {
    id: "rss-1",
    link: "https://www.bloomberg.com",
    publishedAt: Date.now() - 1000 * 60 * 40,
    title: "Markets wrap: S&P 500 closes at record high",
  },
  {
    id: "rss-2",
    link: "https://www.wsj.com",
    publishedAt: Date.now() - 1000 * 60 * 90,
    title: "Treasury yields edge higher after jobs data",
  },
  {
    id: "rss-3",
    link: "https://www.coindesk.com",
    publishedAt: Date.now() - 1000 * 60 * 120,
    title: "Bitcoin tops $70K as ETF inflows accelerate",
  },
  {
    id: "rss-4",
    link: "https://www.reuters.com",
    publishedAt: Date.now() - 1000 * 60 * 180,
    title: "Oil falls on demand outlook concerns",
  },
];

// ---------------------------------------------------------------------------
// Mock data — AI Chat
// ---------------------------------------------------------------------------

const CHAT_MESSAGES = [
  {
    id: "1",
    role: "user" as const,
    text: "How much did I spend on food last month?",
  },
  {
    id: "2",
    role: "assistant" as const,
    text: "You spent $342 on food in March — up 12% from February. Restaurants made up $218 and groceries $124.",
  },
  {
    id: "3",
    role: "user" as const,
    text: "Which subscription should I cancel?",
  },
  {
    id: "4",
    role: "assistant" as const,
    text: "Adobe CC at $19.99/mo hasn't had any activity in 47 days. That's your best candidate.",
  },
];

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const NAV_ITEMS: { id: NavId; icon: React.ReactNode; label: string }[] = [
  {
    icon: <HugeiconsIcon icon={Home04Icon} strokeWidth={2} />,
    id: "dashboard",
    label: "Dashboard",
  },
  {
    icon: <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} />,
    id: "accounts",
    label: "Accounts",
  },
  {
    icon: <HugeiconsIcon icon={AppleStocksIcon} strokeWidth={2} />,
    id: "brokerage",
    label: "Brokerage",
  },
  {
    icon: <HugeiconsIcon icon={SearchDollarIcon} strokeWidth={2} />,
    id: "research",
    label: "Research",
  },
  {
    icon: <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={2} />,
    id: "transactions",
    label: "Transactions",
  },
  {
    icon: <HugeiconsIcon icon={Calendar02Icon} strokeWidth={2} />,
    id: "subscriptions",
    label: "Subscriptions",
  },
  {
    icon: <HugeiconsIcon icon={NewsIcon} strokeWidth={2} />,
    id: "news",
    label: "News",
  },
];

function MiniSidebar({
  active,
  onNav,
}: {
  active: NavId;
  onNav: (id: NavId) => void;
}) {
  return (
    <div className="flex h-full w-[240px] flex-shrink-0 flex-col gap-1 rounded-l-xl bg-sidebar p-2">
      {/* User row */}
      <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
        <div className="size-6 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-violet-500" />
        <span className="truncate text-sm font-medium">Alex Johnson</span>
      </div>

      {/* Nav */}
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm leading-none transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0",
              active === item.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            )}
            key={item.id}
            type="button"
            onClick={() => onNav(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* AI Chat section */}
      <div className="mt-3">
        <button
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm leading-none transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0",
            active === "ai-chat"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "bg-input/60 text-muted-foreground hover:bg-input"
          )}
          type="button"
          onClick={() => onNav("ai-chat")}
        >
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
          <span>New Chat</span>
        </button>

        <div className="flex flex-col gap-0.5">
          <div className="px-2 pt-2 pb-1 text-left text-xs font-medium text-white/60">
            Today
          </div>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-white transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => onNav("ai-chat")}
          >
            Q1 spending summary
          </button>
          <div className="px-2 pt-2 pb-1 text-left text-xs font-medium text-white/60">
            Yesterday
          </div>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-white transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => onNav("ai-chat")}
          >
            Subscription audit
          </button>
          <div className="px-2 pt-2 pb-1 text-left text-xs font-medium text-white/60">
            Last 7 Days
          </div>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-white transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => onNav("ai-chat")}
          >
            Portfolio rebalancing
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-white transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => onNav("ai-chat")}
          >
            Tax loss harvesting ideas
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-white transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => onNav("ai-chat")}
          >
            Emergency fund analysis
          </button>
          <div className="px-2 pt-2 pb-1 text-left text-xs font-medium text-white/60">
            Older
          </div>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-white transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => onNav("ai-chat")}
          >
            2025 year-end review
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-white transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => onNav("ai-chat")}
          >
            Roth vs Traditional IRA
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-white transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => onNav("ai-chat")}
          >
            Budget optimization
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-white transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => onNav("ai-chat")}
          >
            Crypto portfolio analysis
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content views — real app components
// ---------------------------------------------------------------------------

function DashboardView() {
  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4">
        <NetWorthSection />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <DashboardRecentTransactionsCard />
          <div className="flex justify-center">
            <DashboardSubscriptionsCalendar />
          </div>
          <DashboardInvestmentPerformanceCard />
        </div>
      </div>
    </div>
  );
}

function AccountsView() {
  return (
    <div className="h-full overflow-hidden px-4">
      <AccountsList activeFilter="all" isComplete items={MOCK_ACCOUNTS} />
    </div>
  );
}

function BrokerageView() {
  return (
    <div className="h-full overflow-hidden">
      <BrokerageOverview
        accounts={MOCK_BROKERAGE_ACCOUNTS}
        positions={MOCK_POSITIONS}
        recentActivities={MOCK_ACTIVITIES}
      />
    </div>
  );
}

function ResearchView() {
  const [period, setPeriod] = useState<ChartPeriod>("3M");
  const data = mockChartPoints(period, "TSLA");

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <div className="mb-4 flex items-center gap-3">
        <TickerLogo size={32} symbol="TSLA" />
        <div>
          <p className="text-sm font-semibold leading-none">Tesla Inc.</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            TSLA · NASDAQ
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm font-bold tabular-nums">$329.22</p>
          <p className="mt-0.5 text-[10px] text-red-500 tabular-nums">
            −0.39% today
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <LightweightPriceChart
          data={data}
          height={220}
          period={period}
          setPeriod={setPeriod}
        />
      </div>
    </div>
  );
}

function TransactionsView() {
  return (
    <div className="h-full overflow-hidden pt-4">
      <TransactionsTable isComplete items={TRANSACTIONS} />
    </div>
  );
}

function SubscriptionsView() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
      <BabySubscriptionsCalendar />
    </div>
  );
}

function NewsView() {
  return (
    <div className="h-full overflow-hidden">
      <NewsMagazine
        defaultTab="general"
        eventsForYou={MOCK_NEWS_EVENTS.slice(0, 2)}
        eventsGeneral={MOCK_NEWS_EVENTS}
        rssItems={MOCK_RSS_ITEMS}
      />
    </div>
  );
}

function AiChatView() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden space-y-3 p-3">
        {CHAT_MESSAGES.map((msg) => (
          <Message from={msg.role} key={msg.id}>
            <MessageContent>{msg.text}</MessageContent>
          </Message>
        ))}
      </div>
      <div className="border-t border-border/60 p-3">
        <ChatPromptInput />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View map
// ---------------------------------------------------------------------------

function ActiveView({ active }: { active: NavId }) {
  switch (active) {
    case "dashboard": {
      return <DashboardView />;
    }
    case "accounts": {
      return <AccountsView />;
    }
    case "brokerage": {
      return <BrokerageView />;
    }
    case "research": {
      return <ResearchView />;
    }
    case "transactions": {
      return <TransactionsView />;
    }
    case "subscriptions": {
      return <SubscriptionsView />;
    }
    case "news": {
      return <NewsView />;
    }
    case "ai-chat": {
      return <AiChatView />;
    }
    default: {
      return <DashboardView />;
    }
  }
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export function AppPreview() {
  const [active, setActive] = useState<NavId>("dashboard");

  return (
    <BrowserWindow className="w-full h-full" size="2xl" variant="chrome">
      <div className="flex h-full overflow-hidden rounded-b-2xl bg-sidebar">
        <MiniSidebar active={active} onNav={setActive} />

        {/* Inset content area */}
        <div className="m-1 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-sidebar-inset">
          <header className="flex h-[42px] shrink-0 items-center gap-2 px-4 pt-2">
            <h1 className="flex-1 truncate text-left text-lg font-semibold">
              Cobalt
            </h1>
            <button
              type="button"
              className="flex h-9 min-w-0 max-w-[15rem] flex-1 items-center gap-2 rounded-2xl bg-input/30 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-input/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <HugeiconsIcon
                aria-hidden
                className="size-5 shrink-0 opacity-50"
                icon={SearchIcon}
                strokeWidth={2}
              />
              <span className="min-w-0 flex-1 truncate">Search…</span>
              <KbdGroup
                aria-hidden
                className="pointer-events-none shrink-0 gap-0.5"
              >
                <Kbd className="min-w-6 px-1">⌘</Kbd>
                <Kbd className="min-w-6 px-1">K</Kbd>
              </KbdGroup>
            </button>
            <button
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-sidebar-accent/50"
              type="button"
            >
              <HugeiconsIcon
                className="size-5"
                icon={EyeIcon}
                strokeWidth={2}
              />
            </button>
            <button
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-sidebar-accent/50"
              type="button"
            >
              <HugeiconsIcon
                className="size-5"
                icon={BellDotIcon}
                strokeWidth={2}
              />
            </button>
          </header>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full overflow-hidden">
              <ActiveView active={active} />
            </div>
          </div>
        </div>
      </div>
    </BrowserWindow>
  );
}

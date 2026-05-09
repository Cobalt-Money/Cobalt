import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import type { FinancialEventCard } from "@cobalt-web/ui/cobalt/news/financial-events-feed";
import type { NewsMagazineSidebarItem } from "@cobalt-web/ui/cobalt/news/news-magazine";
import { TransactionDetailActivity } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail-activity";
import { TransactionDetailSummary } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail-summary";
import { TransactionsTable } from "@cobalt-web/ui/cobalt/transactions/transactions-table";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@cobalt-web/ui/components/ai-elements/message";
import { Kbd, KbdGroup } from "@cobalt-web/ui/components/kbd";
import { Separator } from "@cobalt-web/ui/components/separator";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AppleStocksIcon,
  ArrowLeft01Icon,
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
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { BabyAccounts } from "@/components/landing/baby/baby-accounts";
import { BabyBrokerage } from "@/components/landing/baby/baby-brokerage";
import { BabyDashboard } from "@/components/landing/baby/baby-dashboard";
import { BabyNews } from "@/components/landing/baby/baby-news";
import { BabyNewsArticle } from "@/components/landing/baby/baby-news-article";
import { BabyPromptInput } from "@/components/landing/baby/baby-prompt-input";
import type { BabyScreenerRow } from "@/components/landing/baby/baby-research";
import { BabyResearch } from "@/components/landing/baby/baby-research";
import { BabySubscriptionsCalendar } from "@/components/landing/baby/baby-subscriptions-calendar";
import { BabyTickerDetail } from "@/components/landing/baby/baby-ticker-detail";
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

type ChatThreadId =
  | "new"
  | "q1-summary"
  | "subscriptions"
  | "rebalancing"
  | "tax-harvest"
  | "emergency"
  | "year-end"
  | "roth-vs-traditional"
  | "budget";

// ---------------------------------------------------------------------------
// Mock data — Transactions
// ---------------------------------------------------------------------------

function mockCat(
  groupSystemKey: string,
  groupName: string,
  systemKey: string,
  name: string,
  iconKey = systemKey,
): NonNullable<TransactionListItem["category"]> {
  return {
    groupName,
    groupSystemKey,
    iconKey,
    id: `cat-${systemKey}`,
    name,
    systemKey,
  };
}

const MOCK_CATS = {
  ENTERTAINMENT: mockCat("entertainment", "Entertainment", "movies", "TV & Movies"),
  FOOD_AND_DRINK: mockCat("food_and_drink", "Food & Drink", "restaurants", "Restaurants"),
  GENERAL_MERCHANDISE: mockCat("general_merchandise", "Shopping", "shopping", "General Shopping"),
  GENERAL_SERVICES: mockCat("general_services", "Services", "office_supplies", "Office Supplies"),
  HOME_IMPROVEMENT: mockCat(
    "home_improvement",
    "Home Improvement",
    "home_maintenance",
    "Home Maintenance",
  ),
  INCOME: mockCat("income", "Income", "paycheck", "Paycheck"),
  RENT_AND_UTILITIES: mockCat("rent_and_utilities", "Rent & Utilities", "rent_mortgage", "Rent"),
  TRANSPORTATION: mockCat("transportation", "Transportation", "public_transit", "Public Transit"),
} as const;

function makeTx(
  overrides: Partial<TransactionListItem> &
    Pick<TransactionListItem, "id" | "name" | "amount" | "date">,
): TransactionListItem {
  return {
    accountLogoDomain: null,
    accountName: "Chase Checking",
    accountSubtype: "checking",
    accountType: "depository",
    authorizedDate: null,
    category: null,
    counterparties: null,
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "chase.com",
    location: null,
    lockedFields: [],
    logoUrl: null,
    merchantName: null,
    notes: null,
    pending: false,
    plaidAccountId: "plaid-acc-1",
    source: "plaid",
    tagIds: [],
    website: null,
    ...overrides,
  };
}

function loc(
  address: string,
  city: string,
  region: string,
  postal: string,
  lat: number,
  lon: number,
): NonNullable<TransactionListItem["location"]> {
  return {
    address,
    city,
    country: "US",
    lat,
    lon,
    postal_code: postal,
    region,
    store_number: null,
  };
}

function note(text: string): NonNullable<TransactionListItem["notes"]> {
  return text;
}

function noteWithBullets(
  intro: string,
  items: string[],
): NonNullable<TransactionListItem["notes"]> {
  return [intro, ...items.map((item) => `- ${item}`)].join("\n");
}

const TRANSACTIONS: TransactionListItem[] = [
  makeTx({
    amount: -4.5,
    category: MOCK_CATS.FOOD_AND_DRINK,
    date: "2026-04-11",
    id: "tx-1",
    location: loc("66 Mint St", "San Francisco", "CA", "94103", 37.7824, -122.4067),
    name: "Blue Bottle Coffee",
    notes: note("Morning oat milk latte before standup."),
    website: "bluebottlecoffee.com",
  }),
  makeTx({
    amount: -12.99,
    category: MOCK_CATS.ENTERTAINMENT,
    date: "2026-04-11",
    id: "tx-2",
    institutionName: "Fidelity",
    institutionUrl: "fidelity.com",
    name: "Spotify",
    notes: note("Premium family plan — split with Alex."),
    website: "spotify.com",
  }),
  makeTx({
    amount: 3240,
    category: MOCK_CATS.INCOME,
    date: "2026-04-10",
    id: "tx-3",
    institutionName: "Chase",
    institutionUrl: "chase.com",
    name: "Payroll",
    notes: note("Bi-weekly direct deposit from employer."),
  }),
  makeTx({
    amount: -89,
    category: MOCK_CATS.GENERAL_MERCHANDISE,
    date: "2026-04-10",
    id: "tx-4",
    institutionName: "Apple",
    institutionUrl: "apple.com",
    name: "Amazon",
    notes: noteWithBullets("Order contents:", [
      "Anker 65W USB-C charger (2-pack)",
      "Monoprice 6ft HDMI 2.1 cable",
      "Velcro cable ties, 50ct",
      "Logitech MX Master 3S mouse",
      "Rain-X windshield washer fluid",
    ]),
    website: "amazon.com",
  }),
  makeTx({
    amount: -156.23,
    category: MOCK_CATS.HOME_IMPROVEMENT,
    date: "2026-04-09",
    id: "tx-5",
    institutionName: "Wells Fargo",
    institutionUrl: "wellsfargo.com",
    name: "PG&E",
    notes: note("April electric + gas bill. Higher than March — space heater."),
    website: "pge.com",
  }),
  makeTx({
    amount: -14.99,
    category: MOCK_CATS.ENTERTAINMENT,
    date: "2026-04-09",
    id: "tx-6",
    institutionName: "Chase",
    institutionUrl: "chase.com",
    name: "Netflix",
    notes: note("Standard plan. Consider downgrading — barely watched in March."),
    website: "netflix.com",
  }),
  makeTx({
    amount: -9.99,
    category: MOCK_CATS.GENERAL_SERVICES,
    date: "2026-04-08",
    id: "tx-7",
    institutionName: "Apple",
    institutionUrl: "apple.com",
    name: "iCloud",
    notes: note("200GB tier — photo library keeps growing."),
    website: "apple.com",
  }),
  makeTx({
    amount: -55,
    category: MOCK_CATS.FOOD_AND_DRINK,
    date: "2026-04-07",
    id: "tx-8",
    institutionName: "Chase",
    institutionUrl: "chase.com",
    location: loc("19 W 57th St", "New York", "NY", "10019", 40.7638, -73.9737),
    name: "Nobu",
    notes: note("Birthday dinner with Priya. Black cod was worth it."),
    website: "noburestaurants.com",
  }),
  makeTx({
    amount: -2400,
    category: MOCK_CATS.RENT_AND_UTILITIES,
    date: "2026-03-31",
    id: "tx-9",
    institutionName: "Bank of America",
    institutionUrl: "bankofamerica.com",
    location: loc("1288 Howard St, Apt 4B", "San Francisco", "CA", "94103", 37.7765, -122.4117),
    name: "March Rent",
    notes: note("Monthly rent — autopay. Lease renewal in June."),
  }),
  makeTx({
    amount: -42.5,
    category: MOCK_CATS.FOOD_AND_DRINK,
    date: "2026-03-28",
    id: "tx-10",
    institutionName: "Chase",
    institutionUrl: "chase.com",
    location: loc("555 9th St", "San Francisco", "CA", "94103", 37.7717, -122.4077),
    name: "Trader Joe's",
    notes: note("Weekly groceries + flowers."),
    website: "traderjoes.com",
  }),
  makeTx({
    amount: -8.75,
    category: MOCK_CATS.TRANSPORTATION,
    date: "2026-03-27",
    id: "tx-11",
    institutionName: "Wells Fargo",
    institutionUrl: "wellsfargo.com",
    location: loc("Mission St & 16th St", "San Francisco", "CA", "94103", 37.7651, -122.4196),
    name: "Uber",
    notes: note("Ride home after the company offsite dinner."),
    website: "uber.com",
  }),
  makeTx({
    amount: -65,
    category: MOCK_CATS.FOOD_AND_DRINK,
    date: "2026-03-26",
    id: "tx-12",
    institutionName: "Chase",
    institutionUrl: "chase.com",
    location: loc("399 4th St", "San Francisco", "CA", "94107", 37.7799, -122.4005),
    name: "Whole Foods Market",
    notes: note("Restocked pantry — olive oil, coffee beans, snacks."),
    website: "wholefoodsmarket.com",
  }),
  makeTx({
    amount: -29.99,
    category: MOCK_CATS.GENERAL_SERVICES,
    date: "2026-03-25",
    id: "tx-13",
    institutionName: "Wells Fargo",
    institutionUrl: "wellsfargo.com",
    location: loc("301 Pine St", "San Francisco", "CA", "94104", 37.7923, -122.4014),
    name: "Equinox Fitness",
    notes: note("Monthly membership. Goal: hit classes 3x/week."),
    website: "equinox.com",
  }),
  makeTx({
    amount: -18.5,
    category: MOCK_CATS.ENTERTAINMENT,
    date: "2026-03-24",
    id: "tx-14",
    institutionName: "Chase",
    institutionUrl: "chase.com",
    location: loc("135 4th St", "San Francisco", "CA", "94103", 37.7847, -122.4055),
    name: "AMC Theaters",
    notes: note("Saw Dune: Part Two finally. Worth the IMAX upcharge."),
    website: "amctheatres.com",
  }),
  makeTx({
    amount: -52.34,
    category: MOCK_CATS.FOOD_AND_DRINK,
    date: "2026-03-23",
    id: "tx-15",
    institutionName: "Apple",
    institutionUrl: "apple.com",
    name: "DoorDash",
    notes: note("Late-night Thai from Lers Ros. Tip was 20%."),
    website: "doordash.com",
  }),
  makeTx({
    amount: -45.67,
    category: MOCK_CATS.TRANSPORTATION,
    date: "2026-03-22",
    id: "tx-16",
    institutionName: "Chase",
    institutionUrl: "chase.com",
    location: loc("1301 Harrison St", "San Francisco", "CA", "94103", 37.7706, -122.4107),
    name: "Shell Gas Station",
    notes: note("Full tank before the Tahoe drive."),
    website: "shell.com",
  }),
  makeTx({
    amount: -11.32,
    category: MOCK_CATS.TRANSPORTATION,
    date: "2026-03-21",
    id: "tx-17",
    institutionName: "Wells Fargo",
    institutionUrl: "wellsfargo.com",
    location: loc("1455 Market St", "San Francisco", "CA", "94103", 37.7762, -122.4171),
    name: "Lyft",
    notes: note("Quick ride to the dentist appointment."),
    website: "lyft.com",
  }),
];

// ---------------------------------------------------------------------------
// Mock data — Brokerage
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mock data — News
// ---------------------------------------------------------------------------

const MOCK_NEWS_EVENTS: FinancialEventCard[] = [
  {
    articles: [
      {
        id: "art-1",
        imageUrl: "/landing/news/openai.png",
        newsUrl: "https://www.bloomberg.com",
        sourceName: "Bloomberg",
        title: "OpenAI valued at $300B in largest private fundraise ever",
      },
    ],
    createdAt: Date.now() - 1000 * 60 * 30,
    date: Date.now() - 1000 * 60 * 25,
    eventId: "evt-1",
    eventName: "OpenAI raises $40B at $300B valuation in record round",
    eventText:
      "OpenAI closed a $40 billion funding round led by SoftBank, valuing the ChatGPT maker at $300 billion — the largest private tech fundraise in history.",
    id: "evt-1",
    newsItems: 8,
    sentiment: "positive",
    summary:
      "OpenAI's record $40B raise at a $300B valuation cements its position as the most valuable private company in the world, fueling a new wave of AI infrastructure investment.",
    tickers: ["MSFT", "NVDA"],
    topics: ["general", "ai", "tech"],
  },
  {
    articles: [
      {
        id: "art-2",
        imageUrl: "/landing/news/apple.png",
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
        imageUrl: "/landing/news/nvidia.png",
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
        imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
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
  {
    articles: [
      {
        id: "art-5",
        imageUrl: "/landing/news/a16.png",
        newsUrl: "https://www.forbes.com",
        sourceName: "Forbes",
        title:
          "Andreessen Horowitz launches $800M AI fund focusing on infrastructure and applications",
      },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    date: Date.now() - 1000 * 60 * 60 * 12,
    eventId: "evt-5",
    eventName: "a16z unveils $800M dedicated fund for AI-powered startups and infrastructure",
    eventText:
      "Andreessen Horowitz announced its latest artificial intelligence-focused fund, committing $800 million to invest in next-generation AI companies addressing both infrastructure and application layers.",
    id: "evt-5",
    newsItems: 10,
    sentiment: "positive",
    summary:
      "a16z's new $800M AI fund signals continued investor confidence in the sector, targeting opportunities in both AI infrastructure and enterprise software applications.",
    tickers: [],
    topics: ["general", "ai", "tech"],
  },
];

const MOCK_RSS_ITEMS: NewsMagazineSidebarItem[] = [
  {
    id: "rss-1",
    link: "https://www.bloomberg.com",
    publishedAt: Date.now() - 1000 * 60 * 40,
    title: "Markets wrap: S&P 500 closes at record high amid Fed patience signals",
  },
  {
    id: "rss-2",
    link: "https://www.wsj.com",
    publishedAt: Date.now() - 1000 * 60 * 90,
    title: "Treasury yields edge higher after stronger-than-expected jobs data",
  },
  {
    id: "rss-3",
    link: "https://www.coindesk.com",
    publishedAt: Date.now() - 1000 * 60 * 120,
    title: "Bitcoin tops $70K as ETF inflows accelerate and institutional demand grows",
  },
  {
    id: "rss-4",
    link: "https://www.reuters.com",
    publishedAt: Date.now() - 1000 * 60 * 180,
    title: "Oil falls on demand outlook concerns amid economic slowdown fears",
  },
  {
    id: "rss-5",
    link: "https://www.ft.com",
    publishedAt: Date.now() - 1000 * 60 * 240,
    title: "European stocks surge on tech rally and easing rate cut timeline expectations",
  },
  {
    id: "rss-6",
    link: "https://www.cnbc.com",
    publishedAt: Date.now() - 1000 * 60 * 300,
    title: "Magnificent Seven stocks power Nasdaq to fresh all-time highs this quarter",
  },
  {
    id: "rss-7",
    link: "https://www.ft.com",
    publishedAt: Date.now() - 1000 * 60 * 360,
    title: "Central banks signal pause in interest rate hikes as inflation moderates globally",
  },
];

// ---------------------------------------------------------------------------
// Mock data — AI Chat
// ---------------------------------------------------------------------------

const CHAT_THREADS: Record<
  ChatThreadId,
  {
    title: string;
    messages: { id: string; role: "user" | "assistant"; text: string }[];
  }
> = {
  budget: {
    messages: [
      {
        id: "1",
        role: "user" as const,
        text: "Optimize my budget",
      },
      {
        id: "2",
        role: "assistant" as const,
        text: "You have $800/mo discretionary. Cutting dining out by half saves $400. Redirect that to your transit account for a 5.2% boost.",
      },
    ],
    title: "Budget optimization",
  },
  emergency: {
    messages: [
      {
        id: "1",
        role: "user" as const,
        text: "Analyze my emergency fund",
      },
      {
        id: "2",
        role: "assistant" as const,
        text: "You have 4.2 months of expenses saved ($21K). That's below the 6-month target. You're on track to reach it by November.",
      },
    ],
    title: "Emergency fund analysis",
  },
  new: {
    messages: [
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
    ],
    title: "New Chat",
  },
  "q1-summary": {
    messages: [
      {
        id: "1",
        role: "user" as const,
        text: "Give me a spending summary for Q1",
      },
      {
        id: "2",
        role: "assistant" as const,
        text: `**Q1 2026 Spending — $12,847 total**

- **Housing**: $5,396 (42%) — rent & utilities  
- **Food**: $2,313 (18%) — groceries + dining  
- **Shopping**: $1,927 (15%) — clothes, gadgets  
- **Bills**: $1,670 (13%) — phone, internet, insurance  
- **Transport**: $1,542 (12%) — gas, Uber, transit

*Up 8% from Q4 — mainly due to travel.*`,
      },
    ],
    title: "Q1 spending summary",
  },
  rebalancing: {
    messages: [
      {
        id: "1",
        role: "user" as const,
        text: "Rebalance my portfolio",
      },
      {
        id: "2",
        role: "assistant" as const,
        text: "Your current allocation is 70/30 stocks/bonds. Target is 60/40. I'd recommend selling $15K of VTI and buying $15K of BND.",
      },
    ],
    title: "Portfolio rebalancing",
  },
  "roth-vs-traditional": {
    messages: [
      {
        id: "1",
        role: "user" as const,
        text: "Roth vs Traditional?",
      },
      {
        id: "2",
        role: "assistant" as const,
        text: "At your 32% marginal rate, Traditional beats Roth. You'd save ~$3,200 in taxes per $10K contributed vs $0 with Roth.",
      },
    ],
    title: "Roth vs Traditional IRA",
  },
  subscriptions: {
    messages: [
      {
        id: "1",
        role: "user" as const,
        text: "Audit my subscriptions",
      },
      {
        id: "2",
        role: "assistant" as const,
        text: "You have 7 active subscriptions totaling $127/mo. Netflix, Spotify, Adobe CC, Dropbox, Amazon Prime, iCloud+, and YouTube Premium.",
      },
    ],
    title: "Subscription audit",
  },
  "tax-harvest": {
    messages: [
      {
        id: "1",
        role: "user" as const,
        text: "Tax loss harvesting ideas",
      },
      {
        id: "2",
        role: "assistant" as const,
        text: "You have $3,200 in unrealized losses in SCHG. Selling could offset $3,200 in capital gains + $1,000 of ordinary income.",
      },
    ],
    title: "Tax loss harvesting ideas",
  },
  "year-end": {
    messages: [
      {
        id: "1",
        role: "user" as const,
        text: "Give me a year-end review",
      },
      {
        id: "2",
        role: "assistant" as const,
        text: "2025: Net worth up 23% to $485K. Income $320K, expenses $198K. Savings rate 38%. Top spending: housing, food, travel.",
      },
    ],
    title: "2025 year-end review",
  },
};

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
  onChatThread,
  onNav,
}: {
  active: NavId;
  onChatThread: (id: ChatThreadId) => void;
  onNav: (id: NavId) => void;
}) {
  return (
    <div className="flex h-full w-[240px] flex-shrink-0 flex-col gap-1 rounded-l-xl bg-sidebar p-2">
      {/* User row */}
      <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
        <div className="size-6 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-violet-500" />
        <span className="truncate text-sm font-medium text-foreground">Alex Johnson</span>
      </div>

      {/* Nav */}
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm leading-none transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0",
              active === item.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
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
              : "bg-input/60 text-muted-foreground hover:bg-input",
          )}
          type="button"
          onClick={() => {
            onNav("ai-chat");
            onChatThread("new");
          }}
        >
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
          <span>New Chat</span>
        </button>

        <div className="flex flex-col gap-0.5">
          <div className="px-2 pt-2 pb-1 text-left text-xs font-medium text-muted-foreground">
            Today
          </div>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("q1-summary");
            }}
          >
            Q1 spending summary
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("new");
            }}
          >
            Coffee spend this month
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("new");
            }}
          >
            Checking buffer target
          </button>
          <div className="px-2 pt-2 pb-1 text-left text-xs font-medium text-muted-foreground">
            Yesterday
          </div>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("subscriptions");
            }}
          >
            Subscription audit
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("new");
            }}
          >
            Travel budget for June trip
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("new");
            }}
          >
            Cash flow last 30 days
          </button>
          <div className="px-2 pt-2 pb-1 text-left text-xs font-medium text-muted-foreground">
            Last 7 Days
          </div>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("rebalancing");
            }}
          >
            Portfolio rebalancing
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("tax-harvest");
            }}
          >
            Tax loss harvesting ideas
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("emergency");
            }}
          >
            Emergency fund analysis
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("new");
            }}
          >
            Dividend income estimate
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("new");
            }}
          >
            High-yield savings comparison
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("new");
            }}
          >
            Credit card rewards review
          </button>
          <div className="px-2 pt-2 pb-1 text-left text-xs font-medium text-muted-foreground">
            Older
          </div>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("year-end");
            }}
          >
            2025 year-end review
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("roth-vs-traditional");
            }}
          >
            Roth vs Traditional IRA
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("budget");
            }}
          >
            Budget optimization
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("new");
            }}
          >
            401(k) contribution strategy
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("new");
            }}
          >
            Student loan payoff plan
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("new");
            }}
          >
            Mortgage refinance check
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("new");
            }}
          >
            HSA vs FSA breakdown
          </button>
          <button
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
            type="button"
            onClick={() => {
              onNav("ai-chat");
              onChatThread("new");
            }}
          >
            International ETF exposure
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
  return <BabyDashboard />;
}

function AccountsView() {
  return <BabyAccounts />;
}

function BrokerageView() {
  return (
    <div className="h-full overflow-hidden">
      <BabyBrokerage />
    </div>
  );
}

function ResearchView() {
  const [selectedTicker, setSelectedTicker] = useState<BabyScreenerRow | null>(null);

  if (selectedTicker) {
    return (
      <BackableScreen label="Research" onBack={() => setSelectedTicker(null)}>
        <BabyTickerDetail
          data={{
            marketCap: selectedTicker.marketCap,
            name: selectedTicker.name,
            pctChange1d: selectedTicker.pctChange1d,
            pctChangeYtd: selectedTicker.pctChangeYtd,
            peRatio: selectedTicker.peRatio,
            price: selectedTicker.price,
            sector: selectedTicker.sector,
            symbol: selectedTicker.symbol,
            volume: selectedTicker.volume,
          }}
        />
      </BackableScreen>
    );
  }

  return <BabyResearch onOpenTicker={setSelectedTicker} />;
}

function BackableScreen({
  children,
  label,
  onBack,
}: {
  children: ReactNode;
  label: string;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-[42px] shrink-0 items-center px-4 pt-2">
        <button
          className="-ml-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-lg font-semibold text-foreground transition-colors hover:bg-muted"
          onClick={onBack}
          type="button"
        >
          <HugeiconsIcon aria-hidden className="size-5" icon={ArrowLeft01Icon} strokeWidth={2} />
          <span>{label}</span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

function NotesRenderer({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const blocks: ({ type: "p"; text: string } | { type: "ul"; items: string[] })[] = [];
  let bullets: string[] = [];
  for (const line of lines) {
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
    } else {
      if (bullets.length > 0) {
        blocks.push({ items: bullets, type: "ul" });
        bullets = [];
      }
      if (line.trim()) {
        blocks.push({ text: line, type: "p" });
      }
    }
  }
  if (bullets.length > 0) {
    blocks.push({ items: bullets, type: "ul" });
  }

  return (
    <div className="flex flex-col gap-2 text-left text-sm text-foreground">
      {blocks.map((block, i) =>
        block.type === "ul" ? (
          // eslint-disable-next-line react/no-array-index-key
          <ul className="list-disc space-y-1 pl-5" key={i}>
            {block.items.map((item, j) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <p className="whitespace-pre-wrap" key={i}>
            {block.text}
          </p>
        ),
      )}
    </div>
  );
}

function TransactionsView() {
  const [selectedTx, setSelectedTx] = useState<TransactionListItem | null>(null);

  if (selectedTx) {
    return (
      <BackableScreen onBack={() => setSelectedTx(null)} label="Transactions">
        <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-8 pt-[10vh] pb-8">
          <TransactionDetailSummary transaction={selectedTx} />
          {selectedTx.notes ? <NotesRenderer markdown={selectedTx.notes} /> : null}
          <Separator />
          <TransactionDetailActivity editEvents={[]} transaction={selectedTx} />
        </div>
      </BackableScreen>
    );
  }

  return (
    <div className="h-full overflow-hidden pt-4">
      <TransactionsTable isComplete items={TRANSACTIONS} onOpenTransaction={setSelectedTx} />
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
  const [selectedEvent, setSelectedEvent] = useState<FinancialEventCard | null>(null);
  const [selectedRssItem, setSelectedRssItem] = useState<NewsMagazineSidebarItem | null>(null);

  if (selectedEvent || selectedRssItem) {
    return (
      <BackableScreen
        onBack={() => {
          setSelectedEvent(null);
          setSelectedRssItem(null);
        }}
        label="News"
      >
        <div className="mx-auto w-full max-w-2xl pt-6 pb-8">
          <BabyNewsArticle event={selectedEvent} rssItem={selectedRssItem} />
        </div>
      </BackableScreen>
    );
  }

  return (
    <BabyNews
      eventsForYou={MOCK_NEWS_EVENTS.slice(0, 2)}
      eventsGeneral={MOCK_NEWS_EVENTS}
      onOpenEvent={(e) => {
        setSelectedRssItem(null);
        setSelectedEvent(e);
      }}
      onOpenRssItem={(item) => {
        setSelectedEvent(null);
        setSelectedRssItem(item);
      }}
      rssItems={MOCK_RSS_ITEMS}
    />
  );
}

function AiChatView({ thread }: { thread: ChatThreadId }) {
  const threadData = CHAT_THREADS[thread];
  const [guestMessages, setGuestMessages] = useState<
    { id: string; role: "user" | "assistant"; text: string }[]
  >([]);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    setGuestMessages([]);
    setStreamingText("");
    setIsStreaming(false);
  }, [thread]);

  const fullAssistantText =
    "Sign in to Cobalt to get started 😉 — I'll connect to your accounts and give personalized insights about your spending, investments, and more.";

  useEffect(() => {
    if (!isStreaming || streamingText.length >= fullAssistantText.length) {
      return;
    }

    const timeout = setTimeout(() => {
      setStreamingText((prev) => prev + fullAssistantText[prev.length]);
    }, 10);

    return () => clearTimeout(timeout);
  }, [isStreaming, streamingText]);

  const handleGuestSubmit = (userText: string) => {
    setGuestMessages((prev) => [
      ...prev,
      { id: `guest-${prev.length}-1`, role: "user", text: userText },
      {
        id: `guest-${prev.length}-2`,
        role: "assistant",
        text: fullAssistantText,
      },
    ]);
    setStreamingText("");
    setIsStreaming(true);
  };

  const lastMessageId = guestMessages.at(-1)?.id;
  const displayMessages = guestMessages.map((msg) => {
    if (msg.role === "assistant" && isStreaming && msg.id === lastMessageId) {
      return { ...msg, text: streamingText };
    }
    return msg;
  });

  const allMessages = [...threadData.messages, ...displayMessages];

  return (
    <div className="flex h-full flex-col max-w-xl mx-auto">
      <div className="flex-1 overflow-hidden space-y-6 p-3">
        {allMessages.map((msg) => (
          <Message
            className={msg.role === "assistant" ? "items-start" : undefined}
            from={msg.role}
            key={msg.id}
          >
            <MessageContent className="text-left">
              <MessageResponse>{msg.text}</MessageResponse>
            </MessageContent>
          </Message>
        ))}
      </div>
      <div className="p-3">
        <BabyPromptInput onSubmit={handleGuestSubmit} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View map
// ---------------------------------------------------------------------------

function ActiveView({ active, chatThread }: { active: NavId; chatThread: ChatThreadId }) {
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
      return <AiChatView thread={chatThread} />;
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
  const [active, setActive] = useState<NavId>("transactions");
  const [chatThread, setChatThread] = useState<ChatThreadId>("new");

  return (
    <BrowserWindow className="w-full h-full" size="2xl" variant="chrome">
      <div className="flex h-full overflow-hidden rounded-2xl bg-sidebar">
        <MiniSidebar active={active} onChatThread={setChatThread} onNav={setActive} />

        {/* Inset content area */}
        <div className="m-1 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-sidebar-inset">
          <header className="flex h-[42px] shrink-0 items-center gap-2 px-4 pt-2">
            <h1 className="flex-1 truncate text-left text-lg font-semibold">Cobalt</h1>
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
              <KbdGroup aria-hidden className="pointer-events-none shrink-0 gap-0.5">
                <Kbd className="min-w-6 px-1">⌘</Kbd>
                <Kbd className="min-w-6 px-1">K</Kbd>
              </KbdGroup>
            </button>
            <button
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-sidebar-accent/50"
              type="button"
            >
              <HugeiconsIcon className="size-5" icon={EyeIcon} strokeWidth={2} />
            </button>
            <button
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-sidebar-accent/50"
              type="button"
            >
              <HugeiconsIcon className="size-5" icon={BellDotIcon} strokeWidth={2} />
            </button>
          </header>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full overflow-hidden">
              <ActiveView active={active} chatThread={chatThread} />
            </div>
          </div>
        </div>
      </div>
    </BrowserWindow>
  );
}

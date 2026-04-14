import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { AddAccountGrid } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/add-account-grid";
import {
  CobaltCommandDialog,
  CobaltCommandInput,
  CobaltCommandPaletteRoot,
} from "@cobalt-web/ui/cobalt/command-palette";
import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { mapZeroTransactionListRow } from "@cobalt-web/ui/cobalt/transactions/lib/dto";
import type { ZeroTransactionListRow } from "@cobalt-web/ui/cobalt/transactions/lib/dto";
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@cobalt-web/ui/components/command";
import { Kbd, KbdGroup } from "@cobalt-web/ui/components/kbd";
import { cn } from "@cobalt-web/ui/lib/utils";
import { queries, zql } from "@cobalt-web/zero";
import {
  AppleStocksIcon,
  ArrowReloadHorizontalIcon,
  BellDotIcon,
  CreditCardIcon,
  Download02Icon,
  Edit02Icon,
  EyeIcon,
  File02Icon,
  Home04Icon,
  Moon02Icon,
  Search02Icon,
  SearchDollarIcon,
  Settings01Icon,
  Sun01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

import {
  useAccountLauncher,
  useInstitutionSearch,
} from "@/components/accounts/use-add-account-flow";

/** All top-level app routes — icons match {@link AppSidebar} `sidebarNav.navMain`. */
const COMMAND_NAV_ROUTES: readonly {
  icon: typeof Home04Icon;
  keywords?: string[];
  label: string;
  path:
    | "/accounts"
    | "/ai-chat"
    | "/brokerage"
    | "/dashboard"
    | "/news"
    | "/research"
    | "/subscriptions"
    | "/transactions";
}[] = [
  { icon: Home04Icon, label: "Dashboard", path: "/dashboard" },
  {
    icon: ArrowReloadHorizontalIcon,
    keywords: ["tx", "history"],
    label: "Transactions",
    path: "/transactions",
  },
  {
    icon: AppleStocksIcon,
    keywords: ["invest", "trading"],
    label: "Brokerage",
    path: "/brokerage",
  },
  {
    icon: CreditCardIcon,
    keywords: ["bank"],
    label: "Accounts",
    path: "/accounts",
  },
  {
    icon: SearchDollarIcon,
    keywords: ["books", "notes"],
    label: "Research",
    path: "/research",
  },
  {
    icon: Settings01Icon,
    keywords: ["billing", "plan", "subscription"],
    label: "Subscriptions",
    path: "/subscriptions",
  },
  {
    icon: BellDotIcon,
    keywords: ["chat", "ai", "assistant"],
    label: "AI Chat",
    path: "/ai-chat",
  },
  {
    icon: File02Icon,
    keywords: ["articles", "updates"],
    label: "News",
    path: "/news",
  },
];

/** Actions that can be performed globally in the command menu */
interface CommandAction {
  icon: typeof Home04Icon;
  keywords?: string[];
  label: string;
  handleSelect: () => void;
}

function renderCommandItem(action: CommandAction) {
  return (
    <CommandItem
      key={action.label}
      keywords={action.keywords}
      onSelect={action.handleSelect}
      value={action.label}
    >
      <HugeiconsIcon
        aria-hidden
        className="text-muted-foreground"
        icon={action.icon}
        strokeWidth={2}
      />
      {action.label}
    </CommandItem>
  );
}

const transactionAmountFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

const transactionDisplayName = (t: TransactionListItem): string =>
  t.userOverrideName?.trim() ||
  t.merchantName?.trim() ||
  t.name?.trim() ||
  "Untitled";

const formatTransactionAmount = (amount: number | null | undefined): string =>
  amount === null || amount === undefined
    ? ""
    : transactionAmountFormatter.format(Math.abs(amount));

const parseDate = (date: unknown): Date | null => {
  if (typeof date === "number" || typeof date === "string") {
    return new Date(date);
  }
  return date instanceof Date ? date : null;
};

const formatTransactionDate = (date: unknown): string => {
  const parsed = parseDate(date);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
};

const ILIKE_WILDCARD = (query: string): string => `%${query}%`;

/** Pure query builders — no side effects, given the same search string they produce the same ZQL. */
const buildRecentTransactionsQuery = () =>
  zql.transaction
    .related("account", (q) =>
      q.related("connection", (c) => c.related("institution"))
    )
    .orderBy("date", "desc")
    .limit(30);

const buildTransactionSearchQuery = (trimmedSearch: string) => {
  const pattern = ILIKE_WILDCARD(trimmedSearch);
  return zql.transaction
    .where(({ cmp, or }) =>
      or(
        cmp("name", "ILIKE", pattern),
        cmp("merchantName", "ILIKE", pattern),
        cmp("userOverrideName", "ILIKE", pattern)
      )
    )
    .related("account", (q) =>
      q.related("connection", (c) => c.related("institution"))
    )
    .orderBy("date", "desc")
    .limit(50);
};

const buildRecentChatsQuery = () =>
  zql.chats.orderBy("updatedAt", "desc").limit(30);

const buildChatSearchQuery = (trimmedSearch: string) => {
  const pattern = ILIKE_WILDCARD(trimmedSearch);
  return zql.chats
    .where(({ cmp }) => cmp("title", "ILIKE", pattern))
    .orderBy("updatedAt", "desc")
    .limit(50);
};

const toTransactionListItem = (row: unknown): TransactionListItem | null =>
  mapZeroTransactionListRow(row as ZeroTransactionListRow);

const isNotNull = <T,>(value: T | null): value is T => value !== null;

function getPlaceholder(
  inSearchTransactions: boolean,
  inSearchChats: boolean,
  inAddAccount: boolean
): string {
  if (inSearchTransactions) {
    return "Search transactions…";
  }
  if (inSearchChats) {
    return "Search chats…";
  }
  if (inAddAccount) {
    return "Search banks, cards, and brokerages…";
  }
  return "Type a command or search…";
}

interface ChatSearchRow {
  chatId: string;
  title: string | null;
  updatedAt: number | null;
}

const formatChatDate = (date: unknown): string => {
  const parsed = parseDate(date);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

interface CommandMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandMenuContext = createContext<CommandMenuContextValue | null>(null);

export function useCommandMenu(): CommandMenuContextValue {
  const ctx = useContext(CommandMenuContext);
  if (!ctx) {
    throw new Error("useCommandMenu must be used within CommandMenuProvider");
  }
  return ctx;
}

function CommandMenuDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const zero = useZero();
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const [pages, setPages] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const activePage = pages.at(-1);
  const inSearchTransactions = activePage === "search-transactions";
  const inSearchChats = activePage === "search-chats";
  const inAddAccount = activePage === "add-account";
  const trimmedSearch = search.trim();

  const { data: plaidInstitutions = [] } = useInstitutionSearch(
    search,
    inAddAccount
  );
  const dismissAddAccount = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);
  const { handleChoose: handleChooseInstitution } =
    useAccountLauncher(dismissAddAccount);

  /**
   * Lazy preload: warm the client cache with the full transaction history
   * only when the user first enters the "Search Transactions" sub-page. The
   * handle is kept alive for the session so subsequent entries are instant;
   * cleanup runs on unmount (e.g. logout). Users who never search
   * transactions pay zero sync cost.
   */
  const preloadHandleRef = useRef<{ cleanup: () => void } | null>(null);
  useEffect(
    () => () => {
      preloadHandleRef.current?.cleanup();
      preloadHandleRef.current = null;
    },
    []
  );

  const chatPreloadHandleRef = useRef<{ cleanup: () => void } | null>(null);
  useEffect(
    () => () => {
      chatPreloadHandleRef.current?.cleanup();
      chatPreloadHandleRef.current = null;
    },
    []
  );

  /**
   * Raw-ZQL local-only query against the warm client cache (preloaded above
   * in `enterSearchTransactions`). Runs entirely client-side — zero server
   * roundtrips per keystroke. See Zero docs on local-only queries.
   */
  const [transactionRows] = useQuery(
    trimmedSearch.length > 0
      ? buildTransactionSearchQuery(trimmedSearch)
      : buildRecentTransactionsQuery(),
    { enabled: inSearchTransactions }
  );

  const filteredTransactions = useMemo<TransactionListItem[]>(
    () =>
      inSearchTransactions
        ? transactionRows.map(toTransactionListItem).filter(isNotNull)
        : [],
    [inSearchTransactions, transactionRows]
  );

  const [chatRows] = useQuery(
    trimmedSearch.length > 0
      ? buildChatSearchQuery(trimmedSearch)
      : buildRecentChatsQuery(),
    { enabled: inSearchChats }
  );

  const filteredChats = useMemo<ChatSearchRow[]>(
    () => (inSearchChats ? (chatRows as unknown as ChatSearchRow[]) : []),
    [inSearchChats, chatRows]
  );

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  const go = useCallback(
    (to: (typeof COMMAND_NAV_ROUTES)[number]["path"]) => {
      handleOpenChange(false);
      navigate({ to });
    },
    [handleOpenChange, navigate]
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    handleOpenChange(false);
  }, [handleOpenChange, resolvedTheme, setTheme]);

  const themeToggleIcon = resolvedTheme === "dark" ? Sun01Icon : Moon02Icon;

  const enterSearchTransactions = useCallback(() => {
    if (!preloadHandleRef.current) {
      preloadHandleRef.current = zero.preload(queries.transactions.all());
    }
    setSearch("");
    setPages((p) => [...p, "search-transactions"]);
  }, [zero]);

  const enterSearchChats = useCallback(() => {
    if (!chatPreloadHandleRef.current) {
      chatPreloadHandleRef.current = zero.preload(queries.chats.list());
    }
    setSearch("");
    setPages((p) => [...p, "search-chats"]);
  }, [zero]);

  const enterAddAccount = useCallback(() => {
    setSearch("");
    setPages((p) => [...p, "add-account"]);
  }, []);

  const handleInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && search.length === 0 && pages.length > 0) {
        e.preventDefault();
        setPages((p) => p.slice(0, -1));
      }
      if (e.key === "Escape" && pages.length > 0) {
        e.preventDefault();
        setPages((p) => p.slice(0, -1));
        setSearch("");
      }
    },
    [pages.length, search.length]
  );

  const accountActions: CommandAction[] = [
    {
      handleSelect: enterAddAccount,
      icon: Edit02Icon,
      keywords: ["create", "new", "connect", "link", "bank", "brokerage"],
      label: "Add Account",
    },
    {
      handleSelect: () => {
        handleOpenChange(false);
        navigate({ to: "/accounts" });
      },
      icon: EyeIcon,
      keywords: ["view", "details", "balance", "info"],
      label: "View Account Details",
    },
  ];

  const transactionActions: CommandAction[] = [
    {
      handleSelect: enterSearchTransactions,
      icon: Search02Icon,
      keywords: ["find", "query", "search", "filter"],
      label: "Search Transactions",
    },
    {
      handleSelect: () => {
        handleOpenChange(false);
        navigate({ to: "/transactions" });
      },
      icon: Edit02Icon,
      keywords: ["create", "new", "add", "manual"],
      label: "Add Manual Transaction",
    },
    {
      handleSelect: () => {
        handleOpenChange(false);
        navigate({ to: "/transactions" });
      },
      icon: Download02Icon,
      keywords: ["export", "download", "csv", "file"],
      label: "Export Transactions",
    },
  ];

  const brokerageActions: CommandAction[] = [
    {
      handleSelect: () => {
        handleOpenChange(false);
        navigate({ to: "/brokerage" });
      },
      icon: AppleStocksIcon,
      keywords: ["search", "stocks", "funds", "holdings"],
      label: "Search Holdings",
    },
    {
      handleSelect: () => {
        handleOpenChange(false);
        navigate({ to: "/brokerage" });
      },
      icon: Edit02Icon,
      keywords: ["trade", "buy", "sell", "execute"],
      label: "Execute Trade",
    },
    {
      handleSelect: () => {
        handleOpenChange(false);
        navigate({ to: "/brokerage" });
      },
      icon: BellDotIcon,
      keywords: ["alert", "notification", "price", "watch"],
      label: "Set Price Alert",
    },
  ];

  const insightActions: CommandAction[] = [
    {
      handleSelect: () => {
        handleOpenChange(false);
        navigate({ to: "/dashboard" });
      },
      icon: SearchDollarIcon,
      keywords: ["net", "worth", "total", "assets"],
      label: "View Net Worth",
    },
    {
      handleSelect: () => {
        handleOpenChange(false);
        navigate({ to: "/dashboard" });
      },
      icon: File02Icon,
      keywords: ["cash", "flow", "income", "expense"],
      label: "Cash Flow Analysis",
    },
    {
      handleSelect: () => {
        handleOpenChange(false);
        navigate({ to: "/research" });
      },
      icon: File02Icon,
      keywords: ["report", "generate", "summary", "export"],
      label: "Generate Report",
    },
  ];

  const aiChatActions: CommandAction[] = [
    {
      handleSelect: enterSearchChats,
      icon: Search02Icon,
      keywords: ["find", "query", "search", "chat", "conversation", "ai"],
      label: "Search Chats",
    },
    {
      handleSelect: () => {
        handleOpenChange(false);
        navigate({ to: "/ai-chat" });
      },
      icon: Edit02Icon,
      keywords: ["create", "new", "chat", "conversation", "ai"],
      label: "New Chat",
    },
  ];

  const settingActions: CommandAction[] = [
    {
      handleSelect: () => {
        handleOpenChange(false);
        navigate({ to: "/subscriptions" });
      },
      icon: Settings01Icon,
      keywords: ["settings", "preferences", "config", "billing"],
      label: "Subscription Settings",
    },
  ];

  const handleSelectTransaction = useCallback(
    (transactionId: string) => {
      handleOpenChange(false);
      navigate({
        params: { transactionId },
        to: "/transactions/$transactionId",
      });
    },
    [handleOpenChange, navigate]
  );

  const handleSelectChat = useCallback(
    (chatId: string) => {
      handleOpenChange(false);
      navigate({
        params: { chatId },
        to: "/ai-chat/$chatId",
      });
    },
    [handleOpenChange, navigate]
  );

  const chatPrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const prefetchedChatIdsRef = useRef<Set<string>>(new Set());
  useEffect(
    () => () => {
      if (chatPrefetchTimerRef.current !== null) {
        clearTimeout(chatPrefetchTimerRef.current);
      }
    },
    []
  );

  const handleHighlightChange = useCallback(
    (value: string) => {
      if (!inSearchChats) {
        return;
      }
      const [chatId] = value.split(" ", 1);
      if (!chatId || prefetchedChatIdsRef.current.has(chatId)) {
        return;
      }
      if (chatPrefetchTimerRef.current !== null) {
        clearTimeout(chatPrefetchTimerRef.current);
      }
      chatPrefetchTimerRef.current = setTimeout(() => {
        prefetchedChatIdsRef.current.add(chatId);
        zero.preload(queries.chats.messages({ chatId }));
      }, 150);
    },
    [inSearchChats, zero]
  );

  return (
    <CobaltCommandDialog
      className={cn(
        inAddAccount && "h-[600px] max-h-[calc(100vh-8rem)] sm:max-w-[860px]"
      )}
      description="Search for a page or action"
      onOpenChange={handleOpenChange}
      open={open}
      showCloseButton={false}
      title="Command palette"
    >
      <CobaltCommandPaletteRoot
        onValueChange={handleHighlightChange}
        shouldFilter={!(inSearchTransactions || inSearchChats || inAddAccount)}
      >
        <CobaltCommandInput
          onKeyDown={handleInputKeyDown}
          onValueChange={setSearch}
          placeholder={getPlaceholder(
            inSearchTransactions,
            inSearchChats,
            inAddAccount
          )}
          value={search}
        />
        {inAddAccount ? (
          <AddAccountGrid
            compact
            onChoose={handleChooseInstitution}
            plaidInstitutions={plaidInstitutions}
            searchQuery={search}
          />
        ) : (
          <CommandList>
            {inSearchChats && (
              <>
                {filteredChats.length === 0 ? (
                  <CommandEmpty>
                    {trimmedSearch.length > 0
                      ? "No chats found."
                      : "No recent chats."}
                  </CommandEmpty>
                ) : null}
                <CommandGroup
                  heading={
                    trimmedSearch.length > 0 ? "Search results" : "Recent"
                  }
                >
                  {filteredChats.map((c) => {
                    const title = c.title?.trim() || "Untitled chat";
                    return (
                      <CommandItem
                        key={c.chatId}
                        onSelect={() => handleSelectChat(c.chatId)}
                        value={`${c.chatId} ${title}`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-medium">
                              {title}
                            </span>
                            <span className="truncate text-muted-foreground text-xs">
                              {formatChatDate(c.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
            {inSearchTransactions && (
              <>
                {filteredTransactions.length === 0 ? (
                  <CommandEmpty>
                    {trimmedSearch.length > 0
                      ? "No transactions found."
                      : "No recent transactions."}
                  </CommandEmpty>
                ) : null}
                <CommandGroup
                  heading={
                    trimmedSearch.length > 0 ? "Search results" : "Recent"
                  }
                >
                  {filteredTransactions.map((t) => {
                    const name = transactionDisplayName(t);
                    const isInflow = (t.amount ?? 0) < 0;
                    return (
                      <CommandItem
                        key={t.id}
                        onSelect={() => handleSelectTransaction(t.id)}
                        value={`${t.id} ${name} ${t.accountName ?? ""}`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <MerchantLogo
                            className="size-8 shrink-0"
                            counterparties={t.counterparties}
                            logoUrl={t.logoUrl}
                            merchantName={t.merchantName}
                            website={t.website}
                          />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-medium">{name}</span>
                            <span className="truncate text-muted-foreground text-xs">
                              {[t.accountName, formatTransactionDate(t.date)]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "ml-auto shrink-0 font-medium tabular-nums",
                              isInflow
                                ? "text-green-550"
                                : "text-red-600 dark:text-red-500"
                            )}
                          >
                            {isInflow ? "+" : "-"}
                            {formatTransactionAmount(t.amount)}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
            {!(inSearchChats || inSearchTransactions) && (
              <>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Navigation">
                  {COMMAND_NAV_ROUTES.map(({ icon, keywords, label, path }) => (
                    <CommandItem
                      key={String(path)}
                      keywords={keywords}
                      onSelect={() => go(path)}
                      value={`${label} ${path}`}
                    >
                      <HugeiconsIcon
                        aria-hidden
                        className="text-muted-foreground"
                        icon={icon}
                        strokeWidth={2}
                      />
                      {label}
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandGroup heading="Accounts">
                  {accountActions.map(renderCommandItem)}
                </CommandGroup>

                <CommandGroup heading="Transactions">
                  {transactionActions.map(renderCommandItem)}
                </CommandGroup>

                <CommandGroup heading="AI Chat">
                  {aiChatActions.map(renderCommandItem)}
                </CommandGroup>

                <CommandGroup heading="Brokerage">
                  {brokerageActions.map(renderCommandItem)}
                </CommandGroup>

                <CommandGroup heading="Insights">
                  {insightActions.map(renderCommandItem)}
                </CommandGroup>

                <CommandGroup heading="Settings">
                  {settingActions.map(renderCommandItem)}
                  {themeReady ? (
                    <CommandItem
                      keywords={[
                        "appearance",
                        "color",
                        "dark",
                        "light",
                        "mode",
                        "theme",
                        "toggle",
                      ]}
                      onSelect={toggleTheme}
                      value="theme-toggle"
                    >
                      <HugeiconsIcon
                        aria-hidden
                        className="text-muted-foreground"
                        icon={themeToggleIcon}
                        strokeWidth={2}
                      />
                      Toggle theme
                    </CommandItem>
                  ) : null}
                </CommandGroup>
              </>
            )}
          </CommandList>
        )}
      </CobaltCommandPaletteRoot>
    </CobaltCommandDialog>
  );
}

export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((wasOpen) => !wasOpen);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <CommandMenuContext.Provider value={value}>
      {children}
      <CommandMenuDialog onOpenChange={setOpen} open={open} />
    </CommandMenuContext.Provider>
  );
}

export function CommandMenuSearchShortcut() {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return (
    <KbdGroup
      aria-hidden
      className="pointer-events-none hidden shrink-0 gap-0.5 sm:inline-flex"
    >
      <Kbd className="min-w-6 px-1">{isMac ? "⌘" : "Ctrl"}</Kbd>
      <Kbd className="min-w-6 px-1">K</Kbd>
    </KbdGroup>
  );
}

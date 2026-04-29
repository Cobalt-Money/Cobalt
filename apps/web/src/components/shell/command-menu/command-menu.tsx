import { AddAccountGrid } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/add-account-grid";
import type { AddAccountInstitution } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/types";
import { AddCashAccountForm } from "@cobalt-web/ui/cobalt/accounts/add-cash-account-dialog";
import {
  CobaltCommandDialog,
  CobaltCommandInput,
  CobaltCommandPaletteRoot,
} from "@cobalt-web/ui/cobalt/command-palette";
import { AddTransactionForm } from "@cobalt-web/ui/cobalt/transactions/add-transaction-dialog";
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@cobalt-web/ui/components/command";
import { Kbd, KbdGroup } from "@cobalt-web/ui/components/kbd";
import { cn } from "@cobalt-web/ui/lib/utils";
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
  Logout01Icon,
  Money01Icon,
  Moon02Icon,
  Search02Icon,
  SearchDollarIcon,
  Settings01Icon,
  Sun01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

import { useAddCashAccount } from "@/components/accounts/add-cash-account-host";
import {
  useAccountLauncher,
  useInstitutionSearch,
} from "@/components/accounts/use-add-account-flow";
import { SettingsGrid } from "@/components/settings/settings-grid";
import type { SettingsSection } from "@/components/settings/settings-grid";
import { useAddTransaction } from "@/components/transactions/add-transaction-provider";
import { logout } from "@/lib/zero-logout";

import { ChatSearchResults, useChatSearch } from "./search-chats";
import { TickerSearchResults, useTickerSearch } from "./search-tickers";
import {
  TransactionSearchFooter,
  TransactionSearchResults,
  useTransactionSearch,
} from "./search-transactions";

// ── Nav routes ────────────────────────────────────────────────────────────────

/** All top-level app routes — icons match {@link AppSidebar} `sidebarNav.navMain`. */
const COMMAND_NAV_ROUTES: readonly {
  icon: typeof Home04Icon;
  keywords?: string[];
  label: string;
  path:
    | "/accounts"
    | "/ai-chat"
    | "/brokerage"
    | "/home"
    | "/news"
    | "/research"
    | "/subscriptions"
    | "/transactions";
}[] = [
  { icon: Home04Icon, label: "Home", path: "/home" },
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

// ── Action types & renderer ───────────────────────────────────────────────────

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

// ── Placeholder ───────────────────────────────────────────────────────────────

function getPlaceholder(activePage: string | undefined): string {
  if (activePage === "search-transactions") {
    return "Search transactions…";
  }
  if (activePage === "search-chats") {
    return "Search chats…";
  }
  if (activePage === "add-account") {
    return "Search banks, cards, and brokerages…";
  }
  if (activePage === "search-tickers") {
    return "Search tickers…";
  }
  return "Type a command or search…";
}

/** Pages that render their own form body and hide the cmdk input + list. */
function isFormPage(activePage: string | undefined): boolean {
  return activePage === "add-cash-account" || activePage === "add-transaction";
}

// ── Sub-page helpers ──────────────────────────────────────────────────────────

/** True when the palette is in a mode that manages its own item filtering. */
function isClientFilteredPage(activePage: string | undefined): boolean {
  return (
    activePage === "search-transactions" ||
    activePage === "search-chats" ||
    activePage === "add-account" ||
    activePage === "search-tickers"
  );
}

/** True when the default command groups (navigation, actions) should show. */
function isDefaultCommandView(activePage: string | undefined): boolean {
  return (
    activePage !== "search-chats" &&
    activePage !== "search-transactions" &&
    activePage !== "search-tickers"
  );
}

// ── Context ───────────────────────────────────────────────────────────────────

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

// ── Dialog ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line complexity
function CommandMenuDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const [pages, setPages] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>("profile");

  const activePage = pages.at(-1);
  const inSearchTransactions = activePage === "search-transactions";
  const inSearchChats = activePage === "search-chats";
  const inAddAccount = activePage === "add-account";
  const inSearchTickers = activePage === "search-tickers";
  const inSettings = activePage === "settings";
  const inAddCashAccount = activePage === "add-cash-account";
  const inAddTransaction = activePage === "add-transaction";
  const inFormPage = isFormPage(activePage);
  const trimmedSearch = search.trim();

  // ── Search hooks ────────────────────────────────────────────────────────────

  const { filteredTransactions, prefetch: prefetchTransactions } =
    useTransactionSearch(trimmedSearch, inSearchTransactions);

  const {
    filteredChats,
    handleHighlight: handleChatHighlight,
    prefetch: prefetchChats,
  } = useChatSearch(trimmedSearch, inSearchChats);

  const { filteredTickers, isLoadingUniverse, tickerRows } = useTickerSearch(
    trimmedSearch,
    inSearchTickers
  );

  // ── Add-account ─────────────────────────────────────────────────────────────

  const { data: plaidInstitutions = [] } = useInstitutionSearch(
    search,
    inAddAccount
  );
  const dismiss = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { handleChoose: handleChooseConnect, updateModeDialog } =
    useAccountLauncher(dismiss);
  const { submitAddCashAccount, submittingAddCashAccount } =
    useAddCashAccount();
  const {
    locationSearch: addTxLocationSearch,
    manualAccounts,
    merchantSearch: addTxMerchantSearch,
    submitAddTransaction,
    submittingAddTransaction,
  } = useAddTransaction();

  // ── Theme ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const themeToggleIcon = resolvedTheme === "dark" ? Sun01Icon : Moon02Icon;

  // ── Shared navigation ───────────────────────────────────────────────────────

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => onOpenChange(nextOpen),
    [onOpenChange]
  );

  const go = useCallback(
    (to: (typeof COMMAND_NAV_ROUTES)[number]["path"]) => {
      router.preloadRoute({ to });
      handleOpenChange(false);
      navigate({ to });
    },
    [handleOpenChange, navigate, router]
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    handleOpenChange(false);
  }, [handleOpenChange, resolvedTheme, setTheme]);

  // ── Sub-page entry ──────────────────────────────────────────────────────────

  const enterSearchTransactions = useCallback(() => {
    prefetchTransactions();
    setSearch("");
    setPages((p) => [...p, "search-transactions"]);
  }, [prefetchTransactions]);

  const enterSearchChats = useCallback(() => {
    prefetchChats();
    setSearch("");
    setPages((p) => [...p, "search-chats"]);
  }, [prefetchChats]);

  const enterSearchTickers = useCallback(() => {
    setSearch("");
    setPages((p) => [...p, "search-tickers"]);
  }, []);

  const enterAddAccount = useCallback(() => {
    setSearch("");
    setPages((p) => [...p, "add-account"]);
  }, []);

  const enterAddTransaction = useCallback(() => {
    setSearch("");
    setPages((p) => [...p, "add-transaction"]);
  }, []);

  const popPage = useCallback(() => {
    setPages((p) => p.slice(0, -1));
    setSearch("");
    // Sub-page input is unmounting; cmdk's input remount races with body
    // grabbing focus. Double-rAF after state commit, then focus the input.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const el = document.querySelector<HTMLInputElement>(
          '[data-slot="command-input"]'
        );
        el?.focus();
      });
    });
  }, []);

  const handleChooseInstitution = useCallback(
    (institution: AddAccountInstitution) => {
      if (institution.provider === "manual") {
        // Replace add-account page with add-cash-account — same dialog,
        // same morph in/out as other sub-pages.
        setSearch("");
        setPages((p) => [...p.slice(0, -1), "add-cash-account"]);
        return;
      }
      handleChooseConnect(institution);
    },
    [handleChooseConnect]
  );

  const enterSettings = useCallback((section: SettingsSection) => {
    setSearch("");
    setSettingsSection(section);
    setPages((p) => [...p, "settings"]);
  }, []);

  // ── Navigation handlers ─────────────────────────────────────────────────────

  const handleSelectTransaction = useCallback(
    (transactionId: string) => {
      router.preloadRoute({
        params: { transactionId },
        to: "/transactions/$transactionId",
      });
      handleOpenChange(false);
      navigate({
        params: { transactionId },
        to: "/transactions/$transactionId",
      });
    },
    [handleOpenChange, navigate, router]
  );

  const handleSelectChat = useCallback(
    (chatId: string) => {
      router.preloadRoute({ params: { chatId }, to: "/ai-chat/$chatId" });
      handleOpenChange(false);
      navigate({ params: { chatId }, to: "/ai-chat/$chatId" });
    },
    [handleOpenChange, navigate, router]
  );

  const handleSelectTicker = useCallback(
    (symbol: string) => {
      router.preloadRoute({ params: { symbol }, to: "/research/$symbol" });
      handleOpenChange(false);
      navigate({ params: { symbol }, to: "/research/$symbol" });
    },
    [handleOpenChange, navigate, router]
  );

  // ── Keyboard ────────────────────────────────────────────────────────────────

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

  // ── Action groups ───────────────────────────────────────────────────────────

  const accountActions: CommandAction[] = [
    {
      handleSelect: enterAddAccount,
      icon: Edit02Icon,
      keywords: ["create", "new", "connect", "link", "bank", "brokerage"],
      label: "Add Account",
    },
    {
      handleSelect: () => go("/accounts"),
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
      handleSelect: enterAddTransaction,
      icon: Edit02Icon,
      keywords: ["create", "new", "add", "manual"],
      label: "Add Manual Transaction",
    },
    {
      handleSelect: () => go("/transactions"),
      icon: Download02Icon,
      keywords: ["export", "download", "csv", "file"],
      label: "Export Transactions",
    },
  ];

  const brokerageActions: CommandAction[] = [
    {
      handleSelect: enterSearchTickers,
      icon: Search02Icon,
      keywords: ["find", "stock", "equity", "ticker", "symbol", "research"],
      label: "Search Tickers",
    },
    {
      handleSelect: () => go("/brokerage"),
      icon: AppleStocksIcon,
      keywords: ["search", "stocks", "funds", "holdings"],
      label: "Search Holdings",
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
      handleSelect: () => go("/ai-chat"),
      icon: Edit02Icon,
      keywords: ["create", "new", "chat", "conversation", "ai"],
      label: "New Chat",
    },
  ];

  const handleLogout = useCallback(async () => {
    handleOpenChange(false);
    await logout();
    await router.navigate({ to: "/" });
  }, [handleOpenChange, router]);

  const settingActions: CommandAction[] = [
    {
      handleSelect: () => enterSettings("profile"),
      icon: Settings01Icon,
      keywords: ["settings", "preferences", "account", "profile"],
      label: "Settings",
    },
    {
      handleSelect: () => enterSettings("billing"),
      icon: CreditCardIcon,
      keywords: ["billing", "subscription", "plan", "payment"],
      label: "Billing",
    },
    {
      handleSelect: () => {
        void handleLogout();
      },
      icon: Logout01Icon,
      keywords: ["logout", "log out", "sign out", "signout", "exit"],
      label: "Log out",
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {updateModeDialog}
      <CobaltCommandDialog
        className={cn(
          inAddAccount && "h-[600px] max-h-[calc(100vh-8rem)] sm:max-w-[860px]",
          inSettings && "h-[640px] max-h-[calc(100vh-8rem)] sm:max-w-3xl",
          inAddTransaction && "sm:max-w-3xl",
          inAddCashAccount && "sm:max-w-3xl"
        )}
        description="Search for a page or action"
        onOpenChange={handleOpenChange}
        open={open}
        showCloseButton={false}
        title="Command palette"
      >
        <CobaltCommandPaletteRoot
          onValueChange={handleChatHighlight}
          shouldFilter={!isClientFilteredPage(activePage)}
        >
          {inSettings || inFormPage ? null : (
            <CobaltCommandInput
              onKeyDown={handleInputKeyDown}
              onValueChange={setSearch}
              placeholder={getPlaceholder(activePage)}
              value={search}
            />
          )}
          {inSettings && (
            <SettingsGrid
              activeSection={settingsSection}
              compact
              onSectionChange={setSettingsSection}
            />
          )}
          {inAddCashAccount && (
            <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
              <h2 className="flex items-center gap-2 font-semibold text-foreground text-lg leading-none">
                <HugeiconsIcon
                  className="size-6 shrink-0"
                  icon={Wallet01Icon}
                  strokeWidth={2}
                />
                New Cash Account
              </h2>
              <AddCashAccountForm
                onBackspaceWhenEmpty={popPage}
                onSubmit={(values) => {
                  void (async () => {
                    try {
                      await submitAddCashAccount(values);
                      handleOpenChange(false);
                    } catch {
                      // Toast already shown by provider.
                    }
                  })();
                }}
                submitting={submittingAddCashAccount}
              />
            </div>
          )}
          {inAddTransaction && (
            <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
              <h2 className="flex items-center gap-2 font-semibold text-lg text-muted-foreground leading-none">
                <HugeiconsIcon
                  className="size-6 shrink-0"
                  icon={Money01Icon}
                  strokeWidth={2}
                />
                New Transaction
              </h2>
              <AddTransactionForm
                accounts={manualAccounts}
                locationSearch={addTxLocationSearch}
                merchantSearch={addTxMerchantSearch}
                onBackspaceWhenEmpty={popPage}
                onCreateCashAccount={() => {
                  setSearch("");
                  setPages((p) => [...p.slice(0, -1), "add-cash-account"]);
                }}
                onSubmit={(values) => {
                  void (async () => {
                    try {
                      await submitAddTransaction(values);
                      handleOpenChange(false);
                    } catch {
                      // Toast already shown by provider.
                    }
                  })();
                }}
                submitting={submittingAddTransaction}
              />
            </div>
          )}
          {!inSettings && !inFormPage && inAddAccount && (
            <AddAccountGrid
              compact
              onChoose={handleChooseInstitution}
              plaidInstitutions={plaidInstitutions}
              searchQuery={search}
            />
          )}
          {!(inSettings || inAddAccount || inFormPage) && (
            <CommandList>
              {inSearchChats && (
                <ChatSearchResults
                  filteredChats={filteredChats}
                  onSelect={handleSelectChat}
                  trimmedSearch={trimmedSearch}
                />
              )}
              {inSearchTransactions && (
                <TransactionSearchResults
                  filteredTransactions={filteredTransactions}
                  trimmedSearch={trimmedSearch}
                  onSelect={handleSelectTransaction}
                />
              )}
              {inSearchTickers && (
                <TickerSearchResults
                  filteredTickers={filteredTickers}
                  isLoadingUniverse={isLoadingUniverse}
                  tickerRows={tickerRows}
                  trimmedSearch={trimmedSearch}
                  onSelect={handleSelectTicker}
                />
              )}
              {isDefaultCommandView(activePage) && (
                <>
                  <CommandEmpty>No results found.</CommandEmpty>

                  <CommandGroup heading="Navigation">
                    {COMMAND_NAV_ROUTES.map(
                      ({ icon, keywords, label, path }) => (
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
                      )
                    )}
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

                  <CommandGroup heading="Settings">
                    {settingActions.map(renderCommandItem)}
                    {themeReady ? (
                      <CommandItem
                        keywords={[
                          "appearance",
                          "color",
                          "dark",
                          "dark mode",
                          "light",
                          "light mode",
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
          {inSearchTransactions ? <TransactionSearchFooter /> : null}
        </CobaltCommandPaletteRoot>
      </CobaltCommandDialog>
    </>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

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

// ── Shortcut badge ────────────────────────────────────────────────────────────

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

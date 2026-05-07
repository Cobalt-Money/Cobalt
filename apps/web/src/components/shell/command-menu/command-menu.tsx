import { AddAccountGrid } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/add-account-grid";
import type { AddAccountInstitution } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/types";
import { AddManualAccountForm } from "@cobalt-web/ui/cobalt/accounts/add-manual-account-dialog";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { AddTransactionForm } from "@cobalt-web/ui/cobalt/transactions/add-transaction-dialog";
import type { ExportFormat } from "@cobalt-web/ui/cobalt/transactions/lib/export";
import {
  buildTransactionsTsv,
  exportTransactions,
} from "@cobalt-web/ui/cobalt/transactions/lib/export";
import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import {
  CategoryIcon,
  resolveCategoryIcon,
  UNKNOWN_CATEGORY_ICON,
} from "@cobalt-web/ui/cobalt/transactions/categories";
import { AddTagForm } from "@cobalt-web/ui/cobalt/transactions/tags/add-tag-dialog";
import { ManageTagsForm } from "@cobalt-web/ui/cobalt/transactions/tags/manage-tags-dialog";
import type { TagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { isTagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { TagChip } from "@cobalt-web/ui/cobalt/transactions/tags/tag-chip";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@cobalt-web/ui/components/command";
import { Icon } from "@cobalt-web/ui/components/icon";
import { Kbd, KbdGroup } from "@cobalt-web/ui/components/kbd";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AppleStocksIcon,
  ArrowReloadHorizontalIcon,
  BellDotIcon,
  Copy01Icon,
  CreditCardIcon,
  Download02Icon,
  Edit02Icon,
  EyeIcon,
  File02Icon,
  Folder01Icon,
  Home04Icon,
  Logout01Icon,
  Money01Icon,
  Tag01Icon,
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
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

import {
  useAccountLauncher,
  useInstitutionSearch,
} from "@/components/accounts/use-add-account-flow";
import { SettingsGrid } from "@/components/settings/settings-grid";
import type { SettingsSection } from "@/components/settings/settings-grid";
import { useAddManualAccountSubmit } from "@/hooks/use-add-manual-account-submit";
import { useMerchantSearch } from "@/hooks/use-merchant-search";
import { useAddTagSubmit } from "@/hooks/use-add-tag-submit";
import { useAddTransactionData } from "@/hooks/use-add-transaction-data";
import { useAllCategories } from "@/hooks/use-categories";
import { useBulkSetCategory, useBulkSetExcluded } from "@/hooks/use-bulk-transactions";
import {
  useBulkApplyTags,
  useDeleteTag,
  useTagOptions,
  useTags,
  useUpdateTag,
} from "@/hooks/use-tags";
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
  if (activePage === "bulk-set-category") {
    return "Search categories…";
  }
  if (activePage === "bulk-add-tags" || activePage === "bulk-remove-tags") {
    return "Search tags…";
  }
  if (activePage === "bulk-actions") {
    return "Search actions…";
  }
  if (activePage === "bulk-export") {
    return "Export format…";
  }
  return "Type a command or search…";
}

/** Strip protocol/path/`www.` to get a bare domain suitable for Brandfetch CDN paths. */
function domainFromUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  let host = trimmed;
  if (trimmed.includes("://")) {
    try {
      host = new URL(trimmed).hostname;
    } catch {
      return null;
    }
  }
  const cleaned = host
    .replace(/^www\./, "")
    .split("/")[0]
    ?.toLowerCase();
  return cleaned && cleaned.length > 0 ? cleaned : null;
}

/** Pages that render their own form body and hide the cmdk input + list. */
function isFormPage(activePage: string | undefined): boolean {
  return (
    activePage === "add-manual-account" ||
    activePage === "link-or-manual" ||
    activePage === "add-transaction" ||
    activePage === "add-tag" ||
    activePage === "manage-tags"
  );
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
    activePage !== "search-tickers" &&
    activePage !== "bulk-actions" &&
    activePage !== "bulk-set-category" &&
    activePage !== "bulk-add-tags" &&
    activePage !== "bulk-remove-tags" &&
    activePage !== "bulk-export"
  );
}

// ── Context ───────────────────────────────────────────────────────────────────

interface CommandMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Open palette directly to the manage-tags sub-page. */
  openManageTags: () => void;
  /** Open palette directly to the manage-categories sub-page. */
  openManageCategories: () => void;
  /** Open palette to the add-account sub-page. */
  openAddAccount: () => void;
  /** Open palette to the add-manual-account sub-page. */
  openAddManualAccount: () => void;
  /** Open palette to the add-transaction sub-page. */
  openAddTransaction: () => void;
  /** Open palette to the add-tag sub-page, optionally seeded with a name. */
  openAddTag: (opts?: { initialName?: string }) => void;
  /** Open palette to the bulk-actions sub-page for the given transactions. */
  openBulkActions: (transactions: readonly TransactionListItem[]) => void;
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
  pages,
  setPages,
  search,
  setSearch,
  addTagInitialName,
  setAddTagInitialName,
  bulkTargets,
  onClearBulkTargets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: string[];
  setPages: React.Dispatch<React.SetStateAction<string[]>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  addTagInitialName: string;
  setAddTagInitialName: React.Dispatch<React.SetStateAction<string>>;
  bulkTargets: readonly TransactionListItem[];
  onClearBulkTargets: () => void;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("profile");
  const [selectedInstitution, setSelectedInstitution] = useState<AddAccountInstitution | null>(
    null,
  );

  const activePage = pages.at(-1);
  const inSearchTransactions = activePage === "search-transactions";
  const inSearchChats = activePage === "search-chats";
  const inAddAccount = activePage === "add-account";
  const inSearchTickers = activePage === "search-tickers";
  const inSettings = activePage === "settings";
  const inAddManualAccount = activePage === "add-manual-account";
  const inLinkOrManual = activePage === "link-or-manual";
  const inAddTransaction = activePage === "add-transaction";
  const inAddTag = activePage === "add-tag";
  const inManageTags = activePage === "manage-tags";
  const inBulkActions = activePage === "bulk-actions";
  const inBulkSetCategory = activePage === "bulk-set-category";
  const inBulkAddTags = activePage === "bulk-add-tags";
  const inBulkRemoveTags = activePage === "bulk-remove-tags";
  const inBulkExport = activePage === "bulk-export";
  const inBulk =
    inBulkActions || inBulkSetCategory || inBulkAddTags || inBulkRemoveTags || inBulkExport;
  const inFormPage = isFormPage(activePage);
  const trimmedSearch = search.trim();

  // ── Search hooks ────────────────────────────────────────────────────────────

  const { filteredTransactions, prefetch: prefetchTransactions } = useTransactionSearch(
    trimmedSearch,
    inSearchTransactions,
  );

  const {
    filteredChats,
    handleHighlight: handleChatHighlight,
    prefetch: prefetchChats,
  } = useChatSearch(trimmedSearch, inSearchChats);

  const { filteredTickers, isLoadingUniverse, tickerRows } = useTickerSearch(
    trimmedSearch,
    inSearchTickers,
  );

  // ── Add-account ─────────────────────────────────────────────────────────────

  const { data: plaidInstitutions = [] } = useInstitutionSearch(search, inAddAccount);
  const dismiss = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { handleChoose: handleChooseConnect, updateModeDialog } = useAccountLauncher(dismiss);
  const { submit: submitAddManualAccount } = useAddManualAccountSubmit();
  const [brandQuery, setBrandQuery] = useState("");
  const { data: brandResults = [], isFetching: brandSearchLoading } = useMerchantSearch(brandQuery);
  const {
    availableTags: addTxAvailableTags,
    categoryOptions: addTxCategoryOptions,
    locationSearch: addTxLocationSearch,
    manualAccounts,
    merchantSearch: addTxMerchantSearch,
    submit: submitAddTransaction,
  } = useAddTransactionData();
  const { isPending: submittingAddTag, submit: submitAddTagInner } = useAddTagSubmit();
  const submitAddTag = useCallback(
    async (values: Parameters<typeof submitAddTagInner>[0]) => {
      try {
        await submitAddTagInner(values);
      } catch {
        // Toast already shown.
      }
    },
    [submitAddTagInner],
  );

  // ── Manage-tags data ────────────────────────────────────────────────────────

  const { data: allTags } = useTags();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const manageTagsList = useMemo(
    () =>
      allTags
        .filter((t) => t.archivedAt === null && isTagColor(t.color))
        .map((t) => ({
          color: t.color as TagColor,
          count: t.transactionTags?.length ?? 0,
          id: t.id,
          name: t.name,
        })),
    [allTags],
  );

  // ── Bulk-actions data ───────────────────────────────────────────────────────

  const { data: allCategoriesForBulk } = useAllCategories();
  const { options: bulkTagOptions } = useTagOptions();
  const { mutateAsync: bulkSetCategory } = useBulkSetCategory();
  const { mutateAsync: bulkSetExcluded } = useBulkSetExcluded();
  const { mutateAsync: bulkApplyTags } = useBulkApplyTags();
  const bulkCategoryGroups = useMemo(() => {
    type CatRow = (typeof allCategoriesForBulk)[number];
    const groups = new Map<string, { groupName: string; items: CatRow[] }>();
    for (const c of allCategoriesForBulk) {
      if (c.hidden) {
        continue;
      }
      const groupName = c.group?.name ?? "Other";
      const key = `${c.group?.systemKey ?? "_custom"}::${groupName}`;
      const bucket = groups.get(key);
      if (bucket) {
        bucket.items.push(c);
      } else {
        groups.set(key, { groupName, items: [c] });
      }
    }
    return [...groups.values()];
  }, [allCategoriesForBulk]);

  // ── Theme ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const themeToggleIcon = resolvedTheme === "dark" ? Sun01Icon : Moon02Icon;

  // ── Shared navigation ───────────────────────────────────────────────────────

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => onOpenChange(nextOpen),
    [onOpenChange],
  );

  const go = useCallback(
    (to: (typeof COMMAND_NAV_ROUTES)[number]["path"]) => {
      router.preloadRoute({ to });
      handleOpenChange(false);
      navigate({ to });
    },
    [handleOpenChange, navigate, router],
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
  }, [prefetchTransactions, setPages, setSearch]);

  const enterSearchChats = useCallback(() => {
    prefetchChats();
    setSearch("");
    setPages((p) => [...p, "search-chats"]);
  }, [prefetchChats, setPages, setSearch]);

  const enterSearchTickers = useCallback(() => {
    setSearch("");
    setPages((p) => [...p, "search-tickers"]);
  }, [setPages, setSearch]);

  const enterAddAccount = useCallback(() => {
    setSearch("");
    setPages((p) => [...p, "add-account"]);
  }, [setPages, setSearch]);

  const enterAddTransaction = useCallback(() => {
    setSearch("");
    setPages((p) => [...p, "add-transaction"]);
  }, [setPages, setSearch]);

  const enterAddTag = useCallback(
    (initialName?: string) => {
      setAddTagInitialName(initialName ?? "");
      setSearch("");
      setPages((p) => [...p, "add-tag"]);
    },
    [setAddTagInitialName, setPages, setSearch],
  );

  const addTxOnRequestCreateTag = useCallback(
    (initialName: string) => {
      enterAddTag(initialName);
    },
    [enterAddTag],
  );

  const enterManageTags = useCallback(() => {
    setSearch("");
    setPages((p) => [...p, "manage-tags"]);
  }, [setPages, setSearch]);

  const enterBulkSetCategory = useCallback(() => {
    setSearch("");
    setPages((p) => [...p, "bulk-set-category"]);
  }, [setPages, setSearch]);

  const enterBulkAddTags = useCallback(() => {
    setSearch("");
    setPages((p) => [...p, "bulk-add-tags"]);
  }, [setPages, setSearch]);

  const enterBulkRemoveTags = useCallback(() => {
    setSearch("");
    setPages((p) => [...p, "bulk-remove-tags"]);
  }, [setPages, setSearch]);

  const enterBulkExport = useCallback(() => {
    setSearch("");
    setPages((p) => [...p, "bulk-export"]);
  }, [setPages, setSearch]);

  const closeAndClearBulk = useCallback(() => {
    onOpenChange(false);
    onClearBulkTargets();
  }, [onClearBulkTargets, onOpenChange]);

  const handleBulkSetCategory = useCallback(
    (categoryId: string) => {
      const ids = bulkTargets.map((t) => t.id);
      if (ids.length === 0) {
        return;
      }
      void (async () => {
        try {
          await bulkSetCategory({ categoryId, transactionIds: ids });
        } catch {
          // toast already shown
        } finally {
          closeAndClearBulk();
        }
      })();
    },
    [bulkSetCategory, bulkTargets, closeAndClearBulk],
  );

  const handleBulkApplyTag = useCallback(
    (tagId: string, mode: "add" | "remove") => {
      const ids = bulkTargets.map((t) => t.id);
      if (ids.length === 0) {
        return;
      }
      void (async () => {
        try {
          await bulkApplyTags({
            addTagIds: mode === "add" ? [tagId] : [],
            removeTagIds: mode === "remove" ? [tagId] : [],
            transactionIds: ids,
          });
        } catch {
          // toast already shown
        } finally {
          closeAndClearBulk();
        }
      })();
    },
    [bulkApplyTags, bulkTargets, closeAndClearBulk],
  );

  const handleBulkExport = useCallback(
    (format: ExportFormat) => {
      if (bulkTargets.length === 0) {
        return;
      }
      exportTransactions([...bulkTargets], format);
      closeAndClearBulk();
    },
    [bulkTargets, closeAndClearBulk],
  );

  const handleBulkCopy = useCallback(() => {
    if (bulkTargets.length === 0) {
      return;
    }
    const tsv = buildTransactionsTsv([...bulkTargets]);
    void (async () => {
      try {
        await navigator.clipboard.writeText(tsv);
        cobaltToast.bulkSuccess(
          `Copied ${bulkTargets.length} ${bulkTargets.length === 1 ? "row" : "rows"}`,
          "Paste into a spreadsheet to keep columns.",
        );
      } catch {
        cobaltToast.error("Couldn't copy to clipboard.");
      } finally {
        closeAndClearBulk();
      }
    })();
  }, [bulkTargets, closeAndClearBulk]);

  const handleBulkSetExcluded = useCallback(
    (excluded: boolean) => {
      const ids = bulkTargets.map((t) => t.id);
      if (ids.length === 0) {
        return;
      }
      void (async () => {
        try {
          await bulkSetExcluded({ excluded, transactionIds: ids });
        } catch {
          // toast already shown
        } finally {
          closeAndClearBulk();
        }
      })();
    },
    [bulkSetExcluded, bulkTargets, closeAndClearBulk],
  );

  const popPage = useCallback(() => {
    if (pages.length <= 1) {
      // At the last sub-page: close dialog instead of popping to default.
      // setOpen defers pages reset until after exit animation so the
      // sub-page stays visible while closing (no default-palette flash).
      onOpenChange(false);
      return;
    }
    setPages((p) => p.slice(0, -1));
    setSearch("");
    // Sub-page input is unmounting; cmdk's input remount races with body
    // grabbing focus. Double-rAF after state commit, then focus the input.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const el = document.querySelector<HTMLInputElement>('[data-slot="command-input"]');
        el?.focus();
      });
    });
  }, [onOpenChange, pages.length, setPages, setSearch]);

  const handleChooseInstitution = useCallback(
    (institution: AddAccountInstitution) => {
      if (institution.provider === "manual") {
        // Cash tile — no intermediate step, no institution prefill.
        setSelectedInstitution(null);
        setSearch("");
        setPages((p) => [...p.slice(0, -1), "add-manual-account"]);
        return;
      }
      // Plaid/SnapTrade institution — give user a choice between linking and
      // tracking it manually. Stash the institution so the manual form can
      // prefill name + logoDomain if they pick "Add manually".
      setSelectedInstitution(institution);
      setSearch("");
      setPages((p) => [...p.slice(0, -1), "link-or-manual"]);
    },
    [setPages, setSearch],
  );

  const enterSettings = useCallback(
    (section: SettingsSection) => {
      setSearch("");
      setSettingsSection(section);
      setPages((p) => [...p, "settings"]);
    },
    [setPages, setSearch],
  );

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
    [handleOpenChange, navigate, router],
  );

  const handleSelectChat = useCallback(
    (chatId: string) => {
      router.preloadRoute({ params: { chatId }, to: "/ai-chat/$chatId" });
      handleOpenChange(false);
      navigate({ params: { chatId }, to: "/ai-chat/$chatId" });
    },
    [handleOpenChange, navigate, router],
  );

  const handleSelectTicker = useCallback(
    (symbol: string) => {
      router.preloadRoute({ params: { symbol }, to: "/research/$symbol" });
      handleOpenChange(false);
      navigate({ params: { symbol }, to: "/research/$symbol" });
    },
    [handleOpenChange, navigate, router],
  );

  // ── Keyboard ────────────────────────────────────────────────────────────────

  const handleInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && search.length === 0 && pages.length > 0) {
        e.preventDefault();
        if (pages.length === 1) {
          // At the last sub-page: close dialog instead of popping to default.
          // setOpen defers pages reset until after exit animation so the
          // sub-page stays visible while closing (no default-palette flash).
          onOpenChange(false);
          return;
        }
        setPages((p) => p.slice(0, -1));
      }
      if (e.key === "Escape" && pages.length > 0) {
        e.preventDefault();
        if (pages.length === 1) {
          onOpenChange(false);
          return;
        }
        setPages((p) => p.slice(0, -1));
        setSearch("");
      }
    },
    [onOpenChange, pages.length, search.length, setPages, setSearch],
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
      handleSelect: enterAddTag,
      icon: Edit02Icon,
      keywords: ["tag", "label", "category", "create"],
      label: "Add Tag",
    },
    {
      handleSelect: enterManageTags,
      icon: Tag01Icon,
      keywords: ["tag", "label", "edit", "rename", "delete", "manage"],
      label: "Manage Tags",
    },
    {
      handleSelect: () => {
        handleOpenChange(false);
        void navigate({ to: "/transactions/categories" });
      },
      icon: Folder01Icon,
      keywords: ["category", "categories", "group", "edit", "rename", "delete", "manage"],
      label: "Manage Categories",
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
      <CommandDialog
        className={cn(
          inAddAccount && "h-[600px] max-h-[calc(100vh-8rem)] sm:max-w-[860px]",
          inSettings && "h-[640px] max-h-[calc(100vh-8rem)] sm:max-w-3xl",
          inAddTransaction && "sm:max-w-3xl",
          inAddManualAccount && "sm:max-w-3xl",
          inLinkOrManual && "sm:max-w-xl",
          inAddTag && "sm:max-w-lg",
          inManageTags && "sm:max-w-md",
          inBulk && "sm:max-w-lg",
        )}
        description="Search for a page or action"
        onOpenChange={handleOpenChange}
        open={open}
        showCloseButton={false}
        title="Command palette"
      >
        <Command
          onValueChange={handleChatHighlight}
          shouldFilter={!isClientFilteredPage(activePage)}
        >
          {inSettings || inFormPage ? null : (
            <CommandInput
              variant="frameless"
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
          {inLinkOrManual && selectedInstitution !== null && (
            <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
              <h2 className="flex items-center gap-3 font-semibold text-foreground text-lg leading-none">
                {selectedInstitution.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="size-8 shrink-0 rounded-lg object-contain"
                    src={selectedInstitution.logo}
                  />
                ) : null}
                <span>{selectedInstitution.name}</span>
              </h2>
              <p className="text-muted-foreground text-sm">
                How would you like to add this account?
              </p>
              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                <button
                  className="flex flex-col items-start gap-1 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 text-left transition-colors hover:bg-foreground/[0.07]"
                  onClick={() => {
                    handleChooseConnect(selectedInstitution);
                  }}
                  type="button"
                >
                  <span className="font-medium text-foreground text-sm">
                    Link with {selectedInstitution.provider === "plaid" ? "Plaid" : "SnapTrade"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Auto-sync balances and transactions.
                  </span>
                </button>
                <button
                  className="flex flex-col items-start gap-1 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 text-left transition-colors hover:bg-foreground/[0.07]"
                  onClick={() => {
                    setSearch("");
                    setPages((p) => [...p.slice(0, -1), "add-manual-account"]);
                  }}
                  type="button"
                >
                  <span className="font-medium text-foreground text-sm">Add manually</span>
                  <span className="text-muted-foreground text-xs">
                    Track balance yourself; no auto-sync.
                  </span>
                </button>
              </div>
            </div>
          )}
          {inAddManualAccount && (
            <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
              <h2 className="flex items-center gap-2 font-semibold text-foreground text-lg leading-none">
                <Icon className="shrink-0" icon={Wallet01Icon} size="lg" />
                Add an account
              </h2>
              <AddManualAccountForm
                brandSearch={{
                  loading: brandSearchLoading,
                  onQueryChange: setBrandQuery,
                  results: brandResults,
                }}
                initialLogoDomain={domainFromUrl(selectedInstitution?.url ?? null)}
                initialName={selectedInstitution?.name}
                onBackspaceWhenEmpty={popPage}
                onSubmit={(values) => {
                  void (async () => {
                    try {
                      await submitAddManualAccount(values);
                      handleOpenChange(false);
                    } catch {
                      // Toast already shown by provider.
                    }
                  })();
                }}
                submitting={false}
              />
            </div>
          )}
          {inAddTransaction && (
            <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
              <h2 className="flex items-center gap-2 font-semibold text-lg text-muted-foreground leading-none">
                <Icon className="shrink-0" icon={Money01Icon} size="lg" />
                New Transaction
              </h2>
              <AddTransactionForm
                accounts={manualAccounts}
                availableTags={addTxAvailableTags}
                categoryOptions={addTxCategoryOptions}
                locationSearch={addTxLocationSearch}
                merchantSearch={addTxMerchantSearch}
                onBackspaceWhenEmpty={popPage}
                onRequestCreateTag={addTxOnRequestCreateTag}
                onCreateCashAccount={() => {
                  setSearch("");
                  setPages((p) => [...p.slice(0, -1), "add-manual-account"]);
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
                submitting={false}
              />
            </div>
          )}
          {inAddTag && (
            <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
              <h2 className="flex items-center gap-2 font-semibold text-lg text-muted-foreground leading-none">
                <Icon className="shrink-0" icon={Tag01Icon} size="md" />
                New Tag
              </h2>
              <AddTagForm
                initialName={addTagInitialName}
                onBackspaceWhenEmpty={popPage}
                onSubmit={(values) => {
                  void (async () => {
                    try {
                      await submitAddTag(values);
                      // Morph back to the previous sub-page (e.g. manage-tags)
                      // when there is one; otherwise close the palette.
                      if (pages.length > 1) {
                        popPage();
                      } else {
                        handleOpenChange(false);
                      }
                    } catch {
                      // Toast already shown by provider.
                    }
                  })();
                }}
                submitting={submittingAddTag}
              />
            </div>
          )}
          {inManageTags && (
            <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
              <h2 className="flex items-center gap-2 font-semibold text-lg text-muted-foreground leading-none">
                <Icon className="shrink-0" icon={Tag01Icon} size="md" />
                Manage tags
              </h2>
              <ManageTagsForm
                onDelete={(tagId) => {
                  deleteTag.mutate(tagId);
                }}
                onRecolor={(tagId, color) => {
                  updateTag.mutate({ body: { color }, tagId });
                }}
                onRename={(tagId, name) => {
                  updateTag.mutate({ body: { name }, tagId });
                }}
                onRequestCreate={enterAddTag}
                tags={manageTagsList}
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
              {inBulkActions && (
                <>
                  <CommandEmpty>No actions found.</CommandEmpty>
                  <CommandGroup heading={`${bulkTargets.length} transactions`}>
                    <CommandItem
                      keywords={["category", "categorize"]}
                      onSelect={enterBulkSetCategory}
                      value="Set category"
                    >
                      <HugeiconsIcon
                        aria-hidden
                        className="text-muted-foreground"
                        icon={Folder01Icon}
                        strokeWidth={2}
                      />
                      Set category…
                    </CommandItem>
                    <CommandItem
                      keywords={["tag", "label", "add"]}
                      onSelect={enterBulkAddTags}
                      value="Add tags"
                    >
                      <HugeiconsIcon
                        aria-hidden
                        className="text-muted-foreground"
                        icon={Tag01Icon}
                        strokeWidth={2}
                      />
                      Add tags…
                    </CommandItem>
                    <CommandItem
                      keywords={["tag", "label", "remove"]}
                      onSelect={enterBulkRemoveTags}
                      value="Remove tags"
                    >
                      <HugeiconsIcon
                        aria-hidden
                        className="text-muted-foreground"
                        icon={Tag01Icon}
                        strokeWidth={2}
                      />
                      Remove tags…
                    </CommandItem>
                    <CommandItem
                      keywords={["exclude", "spending", "insights", "hide"]}
                      onSelect={() => handleBulkSetExcluded(true)}
                      value="Exclude from spending"
                    >
                      <HugeiconsIcon
                        aria-hidden
                        className="text-muted-foreground"
                        icon={EyeIcon}
                        strokeWidth={2}
                      />
                      Exclude from spending
                    </CommandItem>
                    <CommandItem
                      keywords={["include", "spending", "insights", "show"]}
                      onSelect={() => handleBulkSetExcluded(false)}
                      value="Include in spending"
                    >
                      <HugeiconsIcon
                        aria-hidden
                        className="text-muted-foreground"
                        icon={EyeIcon}
                        strokeWidth={2}
                      />
                      Include in spending
                    </CommandItem>
                    <CommandItem
                      keywords={["copy", "clipboard", "paste", "tsv"]}
                      onSelect={handleBulkCopy}
                      value="Copy"
                    >
                      <HugeiconsIcon
                        aria-hidden
                        className="text-muted-foreground"
                        icon={Copy01Icon}
                        strokeWidth={2}
                      />
                      Copy as table
                    </CommandItem>
                    <CommandItem
                      keywords={["export", "download", "csv", "xlsx", "excel"]}
                      onSelect={enterBulkExport}
                      value="Export"
                    >
                      <HugeiconsIcon
                        aria-hidden
                        className="text-muted-foreground"
                        icon={Download02Icon}
                        strokeWidth={2}
                      />
                      Export…
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
              {inBulkExport && (
                <>
                  <CommandEmpty>No formats found.</CommandEmpty>
                  <CommandGroup heading="Export format">
                    <CommandItem
                      keywords={["csv", "comma", "spreadsheet"]}
                      onSelect={() => handleBulkExport("csv")}
                      value="CSV"
                    >
                      <HugeiconsIcon
                        aria-hidden
                        className="text-muted-foreground"
                        icon={Download02Icon}
                        strokeWidth={2}
                      />
                      CSV
                    </CommandItem>
                    <CommandItem
                      keywords={["xlsx", "excel", "spreadsheet"]}
                      onSelect={() => handleBulkExport("xlsx")}
                      value="XLSX"
                    >
                      <HugeiconsIcon
                        aria-hidden
                        className="text-muted-foreground"
                        icon={Download02Icon}
                        strokeWidth={2}
                      />
                      XLSX (Excel)
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
              {inBulkSetCategory && (
                <>
                  <CommandEmpty>No categories found.</CommandEmpty>
                  {bulkCategoryGroups.map((group) => (
                    <CommandGroup heading={group.groupName} key={group.groupName}>
                      {group.items.map((cat) => {
                        const icon = resolveCategoryIcon(cat.iconKey) ?? UNKNOWN_CATEGORY_ICON;
                        return (
                          <CommandItem
                            key={cat.id}
                            keywords={[group.groupName]}
                            onSelect={() => handleBulkSetCategory(cat.id)}
                            value={`${cat.name} ${group.groupName}`}
                          >
                            <CategoryIcon icon={icon} sizeClassName="size-5" />
                            {cat.name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </>
              )}
              {(inBulkAddTags || inBulkRemoveTags) && (
                <>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup heading={inBulkAddTags ? "Add tag" : "Remove tag"}>
                    {bulkTagOptions.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        onSelect={() =>
                          handleBulkApplyTag(tag.id, inBulkAddTags ? "add" : "remove")
                        }
                        value={tag.name}
                      >
                        <TagChip color={tag.color} name={tag.name} size="sm" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              {isDefaultCommandView(activePage) && (
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
        </Command>
      </CommandDialog>
    </>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpenState] = useState(false);
  const [pages, setPages] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [addTagInitialName, setAddTagInitialName] = useState("");
  const [bulkTargets, setBulkTargets] = useState<readonly TransactionListItem[]>([]);
  const clearBulkTargets = useCallback(() => setBulkTargets([]), []);

  const setOpen = useCallback((nextOpen: boolean) => {
    setOpenState(nextOpen);
    if (!nextOpen) {
      // Defer reset until after dialog exit animation so the active sub-page
      // stays visible while closing instead of flashing the default palette.
      window.setTimeout(() => {
        setPages([]);
        setSearch("");
        setBulkTargets([]);
      }, 200);
    }
  }, []);

  const openAt = useCallback((page: string) => {
    setPages([page]);
    setSearch("");
    setOpenState(true);
  }, []);

  const openManageTags = useCallback(() => openAt("manage-tags"), [openAt]);
  const openManageCategories = useCallback(() => {
    void navigate({ to: "/transactions/categories" });
  }, [navigate]);
  const openAddAccount = useCallback(() => openAt("add-account"), [openAt]);
  const openAddManualAccount = useCallback(() => openAt("add-manual-account"), [openAt]);
  const openAddTransaction = useCallback(() => openAt("add-transaction"), [openAt]);
  const openAddTag = useCallback(
    (opts?: { initialName?: string }) => {
      setAddTagInitialName(opts?.initialName ?? "");
      openAt("add-tag");
    },
    [openAt],
  );
  const openBulkActions = useCallback(
    (transactions: readonly TransactionListItem[]) => {
      setBulkTargets([...transactions]);
      openAt("bulk-actions");
    },
    [openAt],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpenState((wasOpen) => {
          const next = !wasOpen;
          if (!next) {
            window.setTimeout(() => {
              setPages([]);
              setSearch("");
            }, 200);
          }
          return next;
        });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      open,
      openAddAccount,
      openAddManualAccount,
      openAddTag,
      openAddTransaction,
      openBulkActions,
      openManageCategories,
      openManageTags,
      setOpen,
    }),
    [
      open,
      openAddAccount,
      openAddManualAccount,
      openAddTag,
      openAddTransaction,
      openBulkActions,
      openManageCategories,
      openManageTags,
      setOpen,
    ],
  );

  return (
    <CommandMenuContext.Provider value={value}>
      {children}
      <CommandMenuDialog
        addTagInitialName={addTagInitialName}
        bulkTargets={bulkTargets}
        onClearBulkTargets={clearBulkTargets}
        onOpenChange={setOpen}
        open={open}
        pages={pages}
        search={search}
        setAddTagInitialName={setAddTagInitialName}
        setPages={setPages}
        setSearch={setSearch}
      />
    </CommandMenuContext.Provider>
  );
}

// ── Shortcut badge ────────────────────────────────────────────────────────────

export function CommandMenuSearchShortcut() {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return (
    <KbdGroup aria-hidden className="pointer-events-none hidden shrink-0 gap-0.5 sm:inline-flex">
      <Kbd className="min-w-6 px-1">{isMac ? "⌘" : "Ctrl"}</Kbd>
      <Kbd className="min-w-6 px-1">K</Kbd>
    </KbdGroup>
  );
}

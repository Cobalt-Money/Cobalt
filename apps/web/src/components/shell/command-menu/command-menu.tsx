import { AddAccountGrid } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/add-account-grid";
import type { TransactionResponse } from "@cobalt-web/server-data/transactions/schemas";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
} from "@cobalt-web/ui/components/command";
import { Kbd, KbdGroup } from "@cobalt-web/ui/components/kbd";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

import {
  useAccountLauncher,
  useInstitutionSearch,
} from "@/components/accounts/use-add-account-flow";
import { useQuery as useZeroQuery } from "@rocicorp/zero/react";
import { queries } from "@cobalt-web/zero";
import { useTagOptions } from "@/hooks/use-tags";

import { useAccountChoice } from "./use-account-choice";
import { useBulkActions } from "./use-bulk-actions";
import { useCloseAndGo } from "./use-close-and-go";
import type { CommandPage, PageStack } from "./use-page-stack";
import { usePageStack } from "./use-page-stack";

import { AddTagPage } from "./pages/add-tag";
import { BulkExportPage } from "./pages/bulk-export";
import { LinkOrManualPage } from "./pages/link-or-manual";
import { AddManualAccountPage } from "./pages/add-manual-account";
import { AddPositionPage } from "./pages/add-position";
import { BulkActionsPage } from "./pages/bulk-actions";
import { BulkSetCategoryPage } from "./pages/bulk-set-category";
import { BulkTagsPage } from "./pages/bulk-tags";
import { DefaultViewPage } from "./pages/default-view";
import { AddTransactionPage } from "./pages/add-transaction";
import { SellPositionPage } from "./pages/sell-position";
import { ManageTagsPage } from "./pages/manage-tags";
import { ChatSearchResults, useChatSearch } from "./search-chats";
import { TickerSearchResults, useTickerSearch } from "./search-tickers";
import {
  TransactionSearchFooter,
  TransactionSearchResults,
  useTransactionSearch,
} from "./search-transactions";

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

/** Pages that render their own form body and hide the cmdk input + list. */
function isFormPage(activePage: string | undefined): boolean {
  return (
    activePage === "add-manual-account" ||
    activePage === "link-or-manual" ||
    activePage === "add-transaction" ||
    activePage === "add-position" ||
    activePage === "sell-position" ||
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
  /** Open palette to the add-position sub-page. */
  openAddPosition: () => void;
  /** Open palette to the add-tag sub-page, optionally seeded with a name. */
  openAddTag: (opts?: { initialName?: string }) => void;
  /** Open palette to the bulk-actions sub-page for the given transactions. */
  openBulkActions: (transactions: readonly TransactionResponse[]) => void;
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
  pageStack,
  search,
  setSearch,
  addTagInitialName,
  setAddTagInitialName,
  bulkTargets,
  onClearBulkTargets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageStack: PageStack;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  addTagInitialName: string;
  setAddTagInitialName: React.Dispatch<React.SetStateAction<string>>;
  bulkTargets: readonly TransactionResponse[];
  onClearBulkTargets: () => void;
}) {
  const navigate = useNavigate();

  const { activePage, isRoot, pop, push } = pageStack;
  const inSearchTransactions = activePage === "search-transactions";
  const inSearchChats = activePage === "search-chats";
  const inAddAccount = activePage === "add-account";
  const inSearchTickers = activePage === "search-tickers";
  const inAddManualAccount = activePage === "add-manual-account";
  const inLinkOrManual = activePage === "link-or-manual";
  const inAddTransaction = activePage === "add-transaction";
  const inAddPosition = activePage === "add-position";
  const inSellPosition = activePage === "sell-position";
  const inAddTag = activePage === "add-tag";
  const inManageTags = activePage === "manage-tags";
  const inBulkActions = activePage === "bulk-actions";
  const inBulkSetCategory = activePage === "bulk-set-category";
  const inBulkAddTags = activePage === "bulk-add-tags";
  const inBulkRemoveTags = activePage === "bulk-remove-tags";
  const inBulkExport = activePage === "bulk-export";
  const inFormPage = isFormPage(activePage);
  const trimmedSearch = search.trim();

  // ── Search hooks ────────────────────────────────────────────────────────────

  const { filteredTransactions, handleHighlight: handleTransactionHighlight } =
    useTransactionSearch(search, open && inSearchTransactions);

  const { filteredChats, handleHighlight: handleChatHighlight } = useChatSearch(
    search,
    open && inSearchChats,
  );

  const { filteredTickers, isLoadingUniverse, tickerRows } = useTickerSearch(
    trimmedSearch,
    inSearchTickers,
  );

  // ── Add-account ─────────────────────────────────────────────────────────────

  const { data: plaidInstitutions = [] } = useInstitutionSearch(search, inAddAccount);
  const dismiss = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { handleChoose: handleChooseConnect, updateModeDialog } = useAccountLauncher(dismiss);

  // ── Bulk-actions data ───────────────────────────────────────────────────────

  const [allCategoriesForBulk] = useZeroQuery(queries.categories.list({ includeHidden: true }));
  const { options: bulkTagOptions } = useTagOptions();
  // ── Shared navigation ───────────────────────────────────────────────────────

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => onOpenChange(nextOpen),
    [onOpenChange],
  );

  // ── Sub-page entry ──────────────────────────────────────────────────────────

  const enter = useCallback(
    (page: CommandPage) => {
      setSearch("");
      push(page);
    },
    [push, setSearch],
  );

  const enterPage = useMemo(
    () => ({
      addAccount: () => enter("add-account"),
      addPosition: () => enter("add-position"),
      addTransaction: () => enter("add-transaction"),
      bulkAddTags: () => enter("bulk-add-tags"),
      bulkExport: () => enter("bulk-export"),
      bulkRemoveTags: () => enter("bulk-remove-tags"),
      bulkSetCategory: () => enter("bulk-set-category"),
      manageTags: () => enter("manage-tags"),
      searchChats: () => enter("search-chats"),
      searchTickers: () => enter("search-tickers"),
      searchTransactions: () => enter("search-transactions"),
      sellPosition: () => enter("sell-position"),
    }),
    [enter],
  );

  const enterAddTag = useCallback(
    (initialName?: string) => {
      setAddTagInitialName(initialName ?? "");
      enter("add-tag");
    },
    [enter, setAddTagInitialName],
  );

  const goToSettings = useCallback(
    (section: "profile" | "billing" | "api-keys") => {
      void navigate({ to: `/settings/${section}` });
      onOpenChange(false);
    },
    [navigate, onOpenChange],
  );

  const bulkActions = useBulkActions({
    onDone: useCallback(() => {
      onOpenChange(false);
      onClearBulkTargets();
    }, [onClearBulkTargets, onOpenChange]),
    targets: bulkTargets,
  });

  const popPage = useCallback(() => {
    if (isRoot) {
      // At the last sub-page: close dialog instead of popping to default.
      // setOpen defers pages reset until after exit animation so the
      // sub-page stays visible while closing (no default-palette flash).
      onOpenChange(false);
      return;
    }
    pop();
    setSearch("");
    // Sub-page input is unmounting; cmdk's input remount races with body
    // grabbing focus. Double-rAF after state commit, then focus the input.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const el = document.querySelector<HTMLInputElement>('[data-slot="command-input"]');
        el?.focus();
      });
    });
  }, [isRoot, onOpenChange, pop, setSearch]);

  const accountChoice = useAccountChoice({
    onClose: useCallback(() => handleOpenChange(false), [handleOpenChange]),
    pageStack,
    resetSearch: useCallback(() => setSearch(""), [setSearch]),
  });
  const {
    cashEntry,
    chooseInstitution,
    selectedInstitution,
    switchToCashAccount,
    switchToManualAccountForSelected,
  } = accountChoice;

  // ── Navigation handlers ─────────────────────────────────────────────────────

  const closeAndGo = useCloseAndGo(useCallback(() => handleOpenChange(false), [handleOpenChange]));

  // ── Keyboard ────────────────────────────────────────────────────────────────

  const handleInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      const hasPage = activePage !== undefined;
      if (e.key === "Backspace" && search.length === 0 && hasPage) {
        e.preventDefault();
        if (isRoot) {
          // At the last sub-page: close dialog instead of popping to default.
          // setOpen defers pages reset until after exit animation so the
          // sub-page stays visible while closing (no default-palette flash).
          onOpenChange(false);
          return;
        }
        pop();
      }
      if (e.key === "Escape" && hasPage) {
        e.preventDefault();
        if (isRoot) {
          onOpenChange(false);
          return;
        }
        pop();
        setSearch("");
      }
    },
    [activePage, isRoot, onOpenChange, pop, search.length, setSearch],
  );

  // ── Action groups ───────────────────────────────────────────────────────────

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {updateModeDialog}
      <CommandDialog
        className={cn(
          inAddAccount && "h-[600px] max-h-[calc(100vh-8rem)] sm:max-w-[860px]",
          inAddTransaction && "sm:max-w-3xl",
          inAddPosition && "sm:max-w-3xl",
          inSellPosition && "sm:max-w-3xl",
          inAddManualAccount && "sm:max-w-3xl",
          inLinkOrManual && "sm:max-w-xl",
          inAddTag && "sm:max-w-lg",
          inManageTags && "sm:max-w-md",
        )}
        description="Search for a page or action"
        onOpenChange={handleOpenChange}
        open={open}
        showCloseButton={false}
        title="Command palette"
      >
        <Command
          onValueChange={(value) => {
            if (inSearchChats) {
              handleChatHighlight(value);
            } else if (inSearchTransactions) {
              handleTransactionHighlight(value);
            }
          }}
          shouldFilter={!isClientFilteredPage(activePage)}
        >
          {inFormPage ? null : (
            <CommandInput
              variant="frameless"
              onKeyDown={handleInputKeyDown}
              onValueChange={setSearch}
              placeholder={getPlaceholder(activePage)}
              value={search}
            />
          )}
          {inLinkOrManual && selectedInstitution !== null && (
            <LinkOrManualPage
              institution={selectedInstitution}
              onChooseConnect={handleChooseConnect}
              onChooseManual={switchToManualAccountForSelected}
            />
          )}
          {inAddManualAccount && (
            <AddManualAccountPage
              cashEntry={cashEntry}
              onBackspaceWhenEmpty={popPage}
              onSuccess={() => handleOpenChange(false)}
              selectedInstitution={selectedInstitution}
            />
          )}
          {inAddTransaction && (
            <AddTransactionPage
              onBackspaceWhenEmpty={popPage}
              onCreateCashAccount={switchToCashAccount}
              onRequestCreateTag={enterAddTag}
              onSuccess={() => handleOpenChange(false)}
            />
          )}
          {inAddPosition && (
            <AddPositionPage
              onBackspaceWhenEmpty={popPage}
              onSuccess={() => handleOpenChange(false)}
            />
          )}
          {inSellPosition && (
            <SellPositionPage
              onBackspaceWhenEmpty={popPage}
              onSuccess={() => handleOpenChange(false)}
            />
          )}
          {inAddTag && (
            <AddTagPage
              initialName={addTagInitialName}
              onBackspaceWhenEmpty={popPage}
              onSuccess={isRoot ? () => handleOpenChange(false) : popPage}
            />
          )}
          {inManageTags && <ManageTagsPage onRequestCreate={enterAddTag} />}
          {!inFormPage && inAddAccount && (
            <AddAccountGrid
              compact
              onChoose={chooseInstitution}
              plaidInstitutions={plaidInstitutions}
              searchQuery={search}
            />
          )}
          {!(inAddAccount || inFormPage) && (
            <CommandList>
              {inSearchChats && (
                <ChatSearchResults
                  filteredChats={filteredChats}
                  onSelect={closeAndGo.chat}
                  trimmedSearch={trimmedSearch}
                />
              )}
              {inSearchTransactions && (
                <TransactionSearchResults
                  filteredTransactions={filteredTransactions}
                  trimmedSearch={trimmedSearch}
                  onSelect={closeAndGo.transaction}
                />
              )}
              {inSearchTickers && (
                <TickerSearchResults
                  filteredTickers={filteredTickers}
                  isLoadingUniverse={isLoadingUniverse}
                  tickerRows={tickerRows}
                  trimmedSearch={trimmedSearch}
                  onSelect={closeAndGo.ticker}
                />
              )}
              {inBulkActions && (
                <BulkActionsPage
                  count={bulkTargets.length}
                  onAddTags={enterPage.bulkAddTags}
                  onCopy={bulkActions.copy}
                  onExport={enterPage.bulkExport}
                  onRemoveTags={enterPage.bulkRemoveTags}
                  onSetCategory={enterPage.bulkSetCategory}
                  onSetExcluded={bulkActions.setExcluded}
                />
              )}
              {inBulkExport && <BulkExportPage onSelect={bulkActions.exportFormat} />}
              {inBulkSetCategory && (
                <BulkSetCategoryPage
                  categories={allCategoriesForBulk}
                  onSelect={bulkActions.setCategory}
                />
              )}
              {(inBulkAddTags || inBulkRemoveTags) && (
                <BulkTagsPage
                  mode={inBulkAddTags ? "add" : "remove"}
                  onSelect={bulkActions.applyTag}
                  options={bulkTagOptions}
                />
              )}
              {isDefaultCommandView(activePage) && (
                <DefaultViewPage
                  nav={{
                    addAccount: enterPage.addAccount,
                    addPosition: enterPage.addPosition,
                    addTag: enterAddTag,
                    addTransaction: enterPage.addTransaction,
                    manageTags: enterPage.manageTags,
                    searchChats: enterPage.searchChats,
                    searchTickers: enterPage.searchTickers,
                    searchTransactions: enterPage.searchTransactions,
                    sellPosition: enterPage.sellPosition,
                    settings: goToSettings,
                  }}
                  onClose={() => handleOpenChange(false)}
                  open={open}
                />
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
  const pageStack = usePageStack();
  const [search, setSearch] = useState("");
  const [addTagInitialName, setAddTagInitialName] = useState("");
  const [bulkTargets, setBulkTargets] = useState<readonly TransactionResponse[]>([]);
  const clearBulkTargets = useCallback(() => setBulkTargets([]), []);

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      setOpenState(nextOpen);
      if (!nextOpen) {
        // Defer reset until after dialog exit animation so the active sub-page
        // stays visible while closing instead of flashing the default palette.
        window.setTimeout(() => {
          pageStack.clear();
          setSearch("");
          setBulkTargets([]);
        }, 200);
      }
    },
    [pageStack],
  );

  const openAt = useCallback(
    (page: CommandPage) => {
      pageStack.openAt(page);
      setSearch("");
      setOpenState(true);
    },
    [pageStack],
  );

  const openManageTags = useCallback(() => openAt("manage-tags"), [openAt]);
  const openManageCategories = useCallback(() => {
    void navigate({ to: "/transactions/categories" });
  }, [navigate]);
  const openAddAccount = useCallback(() => openAt("add-account"), [openAt]);
  const openAddManualAccount = useCallback(() => openAt("add-manual-account"), [openAt]);
  const openAddTransaction = useCallback(() => openAt("add-transaction"), [openAt]);
  const openAddPosition = useCallback(() => openAt("add-position"), [openAt]);
  const openAddTag = useCallback(
    (opts?: { initialName?: string }) => {
      setAddTagInitialName(opts?.initialName ?? "");
      openAt("add-tag");
    },
    [openAt],
  );
  const openBulkActions = useCallback(
    (transactions: readonly TransactionResponse[]) => {
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
              pageStack.clear();
              setSearch("");
            }, 200);
          }
          return next;
        });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pageStack]);

  const value = useMemo(
    () => ({
      open,
      openAddAccount,
      openAddManualAccount,
      openAddPosition,
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
      openAddPosition,
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
        pageStack={pageStack}
        search={search}
        setAddTagInitialName={setAddTagInitialName}
        setSearch={setSearch}
      />
    </CommandMenuContext.Provider>
  );
}

// ── Shortcut badge ────────────────────────────────────────────────────────────

export function CommandMenuSearchShortcut() {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return (
    <KbdGroup aria-hidden className="pointer-events-none hidden shrink-0 sm:inline-flex">
      <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  );
}

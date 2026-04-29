import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import type {
  AddTransactionAccountOption,
  AddTransactionFormValues,
  GeocodeSearchState,
  MerchantSearchState,
} from "@cobalt-web/ui/cobalt/transactions/add-transaction-dialog";
import { AddTransactionDialog } from "@cobalt-web/ui/cobalt/transactions/add-transaction-dialog";
import { mutators, queries } from "@cobalt-web/zero";
import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { useAddCashAccount } from "@/components/accounts/add-cash-account-host";
import { useGeocodeSearch } from "@/hooks/use-geocode-search";
import { useMerchantSearch } from "@/hooks/use-merchant-search";

interface AddTransactionContextValue {
  open: boolean;
  /**
   * Open the add-transaction dialog. `onBackspaceWhenEmpty` fires when user
   * hits Backspace with empty name input — used by the command palette to
   * "morph back" to itself.
   */
  openAddTransaction: (opts?: { onBackspaceWhenEmpty?: () => void }) => void;
  closeAddTransaction: () => void;
  /** Pure submit (mutation + toast). Used by command-palette sub-page. */
  submitAddTransaction: (values: AddTransactionFormValues) => Promise<void>;
  submittingAddTransaction: boolean;
  /** Manual accounts available for selection. */
  manualAccounts: readonly AddTransactionAccountOption[];
  /** Geocode search wiring for the location pill. */
  locationSearch: GeocodeSearchState;
  /** Brandfetch merchant typeahead wiring. */
  merchantSearch: MerchantSearchState;
}

const AddTransactionContext = createContext<AddTransactionContextValue | null>(
  null
);

export function useAddTransaction(): AddTransactionContextValue {
  const ctx = useContext(AddTransactionContext);
  if (!ctx) {
    throw new Error(
      "useAddTransaction must be used within AddTransactionProvider"
    );
  }
  return ctx;
}

export function AddTransactionProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const backspaceCallbackRef = useRef<(() => void) | null>(null);
  const zero = useZero();
  const { openAddCashAccount } = useAddCashAccount();
  const [bankAccounts] = useQuery(queries.accounts.bankAccounts());
  const [locationQuery, setLocationQuery] = useState("");
  const { data: locationResults = [], isFetching: locationLoading } =
    useGeocodeSearch(locationQuery);
  const locationSearch = useMemo<GeocodeSearchState>(
    () => ({
      loading: locationLoading,
      onQueryChange: setLocationQuery,
      results: locationResults,
    }),
    [locationLoading, locationResults]
  );
  const [merchantQuery, setMerchantQuery] = useState("");
  const { data: merchantResults = [], isFetching: merchantLoading } =
    useMerchantSearch(merchantQuery);
  const merchantSearch = useMemo<MerchantSearchState>(
    () => ({
      loading: merchantLoading,
      onQueryChange: setMerchantQuery,
      results: merchantResults.map((r) => ({
        brandId: r.brandId,
        domain: r.domain,
        icon: r.icon,
        name: r.name,
      })),
    }),
    [merchantLoading, merchantResults]
  );

  const openAddTransaction = useCallback(
    (opts?: { onBackspaceWhenEmpty?: () => void }) => {
      backspaceCallbackRef.current = opts?.onBackspaceWhenEmpty ?? null;
      setOpen(true);
    },
    []
  );
  const closeAddTransaction = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) {
      backspaceCallbackRef.current = null;
    }
    setOpen(next);
  }, []);

  const handleBackspaceWhenEmpty = useCallback(() => {
    const cb = backspaceCallbackRef.current;
    backspaceCallbackRef.current = null;
    setOpen(false);
    if (cb) {
      // Defer to next microtask so the dialog close commits before the
      // palette reopens — avoids a brief frame with both mounted.
      queueMicrotask(cb);
    }
  }, []);

  const accounts = useMemo<readonly AddTransactionAccountOption[]>(() => {
    const rows = (bankAccounts ?? []) as readonly {
      id: unknown;
      name: unknown;
      source: unknown;
    }[];
    return rows
      .filter((a) => a.source === "manual")
      .map((a) => ({
        id: String(a.id),
        name: String(a.name),
      }));
  }, [bankAccounts]);

  /**
   * Fire-and-forget local commit; resolves immediately after Zero's optimistic
   * client run. Server confirmation runs in background — failures surface via
   * error toast. See `.agents/skills/cobalt/mutations/SKILL.md`.
   */
  const submitAddTransaction = useCallback(
    (values: AddTransactionFormValues): Promise<void> => {
      const { server } = zero.mutate(
        mutators.transaction.createTransaction({
          accountId: values.accountId,
          amount: values.amount,
          category: values.category
            ? { detailed: "", primary: values.category }
            : undefined,
          date: values.date,
          description: values.description ?? undefined,
          location: values.location ?? undefined,
          merchantName: values.merchantName ?? undefined,
          name: values.name,
          website: values.merchantWebsite ?? undefined,
        })
      );
      cobaltToast.transactionAdded(values.name);
      void (async () => {
        try {
          const result = await server;
          if (result.type === "error") {
            cobaltToast.error(
              result.error.message || "Couldn't add transaction."
            );
          }
        } catch (error) {
          console.error("Failed to add transaction", error);
          cobaltToast.error("Couldn't add transaction. Please try again.");
        }
      })();
      return Promise.resolve();
    },
    [zero]
  );

  const handleSubmit = useCallback(
    async (values: AddTransactionFormValues) => {
      await submitAddTransaction(values);
      setOpen(false);
    },
    [submitAddTransaction]
  );

  const value = useMemo<AddTransactionContextValue>(
    () => ({
      closeAddTransaction,
      locationSearch,
      manualAccounts: accounts,
      merchantSearch,
      open,
      openAddTransaction,
      submitAddTransaction,
      submittingAddTransaction: false,
    }),
    [
      open,
      openAddTransaction,
      closeAddTransaction,
      submitAddTransaction,
      accounts,
      locationSearch,
      merchantSearch,
    ]
  );

  return (
    <AddTransactionContext.Provider value={value}>
      {children}
      <AddTransactionDialog
        accounts={accounts}
        locationSearch={locationSearch}
        merchantSearch={merchantSearch}
        onBackspaceWhenEmpty={handleBackspaceWhenEmpty}
        onCreateCashAccount={() => {
          setOpen(false);
          openAddCashAccount();
        }}
        onOpenChange={handleOpenChange}
        onSubmit={(v) => {
          void handleSubmit(v);
        }}
        open={open}
        submitting={false}
      />
    </AddTransactionContext.Provider>
  );
}

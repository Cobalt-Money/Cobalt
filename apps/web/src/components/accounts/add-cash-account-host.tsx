import type { CashAccountFormValues } from "@cobalt-web/ui/cobalt/accounts/add-cash-account-dialog";
import { AddCashAccountDialog } from "@cobalt-web/ui/cobalt/accounts/add-cash-account-dialog";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { mutators } from "@cobalt-web/zero";
import { useZero } from "@rocicorp/zero/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

interface AddCashAccountContextValue {
  /**
   * Open the cash-account dialog. `onBackspaceWhenEmpty`, when provided,
   * fires when the user hits Backspace with an empty name input — used by
   * the command palette to "morph back" to itself (Linear-style).
   */
  openAddCashAccount: (opts?: { onBackspaceWhenEmpty?: () => void }) => void;
  closeAddCashAccount: () => void;
  /** Pure submit (mutation + toast). Used by command-palette sub-page. */
  submitAddCashAccount: (values: CashAccountFormValues) => Promise<void>;
  /** Always `false` now — kept for API stability while we migrate to fire-and-forget submits. */
  submittingAddCashAccount: boolean;
}

const AddCashAccountContext = createContext<AddCashAccountContextValue | null>(
  null
);

export function useAddCashAccount(): AddCashAccountContextValue {
  const ctx = useContext(AddCashAccountContext);
  if (!ctx) {
    throw new Error(
      "useAddCashAccount must be used within AddCashAccountProvider"
    );
  }
  return ctx;
}

export function AddCashAccountProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const backspaceCallbackRef = useRef<(() => void) | null>(null);
  const zero = useZero();

  const openAddCashAccount = useCallback(
    (opts?: { onBackspaceWhenEmpty?: () => void }) => {
      backspaceCallbackRef.current = opts?.onBackspaceWhenEmpty ?? null;
      setOpen(true);
    },
    []
  );
  const closeAddCashAccount = useCallback(() => {
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

  /**
   * Fire-and-forget local commit; server confirmation runs in background.
   * See `.agents/skills/cobalt/mutations/SKILL.md`.
   */
  const submitAddCashAccount = useCallback(
    (values: CashAccountFormValues): Promise<void> => {
      const { server } = zero.mutate(
        mutators.accounts.createAccount({
          name: values.name,
          subtype: "cash",
          type: "depository",
        })
      );
      cobaltToast.manualAccountCreated(values.name);
      void (async () => {
        try {
          const result = await server;
          if (result.type === "error") {
            cobaltToast.error(
              result.error.message || "Couldn't create account."
            );
          }
        } catch (error) {
          console.error("Failed to create cash account", error);
          cobaltToast.error("Couldn't create account. Please try again.");
        }
      })();
      return Promise.resolve();
    },
    [zero]
  );

  const handleSubmit = useCallback(
    async (values: CashAccountFormValues) => {
      await submitAddCashAccount(values);
      setOpen(false);
    },
    [submitAddCashAccount]
  );

  const value = useMemo<AddCashAccountContextValue>(
    () => ({
      closeAddCashAccount,
      openAddCashAccount,
      submitAddCashAccount,
      submittingAddCashAccount: false,
    }),
    [openAddCashAccount, closeAddCashAccount, submitAddCashAccount]
  );

  return (
    <AddCashAccountContext.Provider value={value}>
      {children}
      <AddCashAccountDialog
        onBackspaceWhenEmpty={handleBackspaceWhenEmpty}
        onOpenChange={handleOpenChange}
        onSubmit={(values) => {
          void handleSubmit(values);
        }}
        open={open}
        submitting={false}
      />
    </AddCashAccountContext.Provider>
  );
}

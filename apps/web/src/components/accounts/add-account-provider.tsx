import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { AddAccountDialogHost } from "./add-account-dialog-host";

interface AddAccountContextValue {
  open: boolean;
  openAddAccount: () => void;
  closeAddAccount: () => void;
}

const AddAccountContext = createContext<AddAccountContextValue | null>(null);

export function useAddAccount(): AddAccountContextValue {
  const ctx = useContext(AddAccountContext);
  if (!ctx) {
    throw new Error("useAddAccount must be used within AddAccountProvider");
  }
  return ctx;
}

export function AddAccountProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openAddAccount = useCallback(() => {
    setOpen(true);
  }, []);
  const closeAddAccount = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ closeAddAccount, open, openAddAccount }),
    [open, openAddAccount, closeAddAccount]
  );

  return (
    <AddAccountContext.Provider value={value}>
      {children}
      <AddAccountDialogHost onOpenChange={setOpen} open={open} />
    </AddAccountContext.Provider>
  );
}

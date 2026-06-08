import type { AccountsFilter } from "@cobalt-web/ui/cobalt/accounts/accounts-toolbar";
import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface AccountsLayoutContextValue {
  activeFilter: AccountsFilter;
  setActiveFilter: (v: AccountsFilter) => void;
}

const AccountsLayoutContext = createContext<AccountsLayoutContextValue | null>(null);

export function AccountsLayoutProvider({ children }: { children: ReactNode }) {
  const [activeFilter, setActiveFilter] = useState<AccountsFilter>("all");
  const value = useMemo(() => ({ activeFilter, setActiveFilter }), [activeFilter]);
  return <AccountsLayoutContext.Provider value={value}>{children}</AccountsLayoutContext.Provider>;
}

export function useAccountsLayout() {
  const ctx = useContext(AccountsLayoutContext);
  if (!ctx) {
    throw new Error("useAccountsLayout must be used under AccountsLayoutProvider");
  }
  return ctx;
}

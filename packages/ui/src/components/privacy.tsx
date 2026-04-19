import {
  DEFAULT_MASK_CHAR,
  DEFAULT_MASK_LENGTH,
  type MaskChar,
  PRIVACY_STORAGE_KEY,
  PrivacyContext,
  type PrivacyContextValue,
  usePrivacy,
} from "@cobalt-web/ui/hooks/use-privacy";
import { cn } from "@cobalt-web/ui/lib/utils";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

function readInitial(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(PRIVACY_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHiddenState] = useState<boolean>(readInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(PRIVACY_STORAGE_KEY, hidden ? "1" : "0");
    } catch {
      // ignore
    }
  }, [hidden]);

  const setHidden = useCallback((value: boolean) => {
    setHiddenState(value);
  }, []);

  const toggle = useCallback(() => {
    setHiddenState((prev) => !prev);
  }, []);

  const mask = useCallback<PrivacyContextValue["mask"]>(
    (value, options) => {
      if (!hidden) {
        return value;
      }
      const char = options?.char ?? DEFAULT_MASK_CHAR;
      const length = options?.length ?? DEFAULT_MASK_LENGTH;
      return char.repeat(length);
    },
    [hidden]
  );

  const contextValue = useMemo<PrivacyContextValue>(
    () => ({ hidden, mask, setHidden, toggle }),
    [hidden, mask, setHidden, toggle]
  );

  return (
    <PrivacyContext.Provider value={contextValue}>
      {children}
    </PrivacyContext.Provider>
  );
}

export interface PrivateAmountProps {
  children: ReactNode;
  char?: MaskChar;
  length?: number;
  className?: string;
}

/**
 * Renders its children unless privacy mode is enabled, in which case it
 * renders a fixed-width masked placeholder (default 6 bullets). Use this
 * to wrap any customer financial number (balances, amounts, P&L).
 */
export function PrivateAmount({
  children,
  char = DEFAULT_MASK_CHAR,
  length = DEFAULT_MASK_LENGTH,
  className,
}: PrivateAmountProps) {
  const { hidden } = usePrivacy();
  if (!hidden) {
    return <>{children}</>;
  }
  return (
    <span
      aria-hidden
      className={cn("tabular-nums tracking-wider select-none", className)}
    >
      {char.repeat(length)}
    </span>
  );
}

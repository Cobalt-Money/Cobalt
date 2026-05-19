import { createContext, useContext } from "react";

export interface DemoContextValue {
  /** True when the current session is a demo account. Source of truth = server session. */
  isDemo: boolean;
  /** Sign current real user into demo mode; preserves origin user for exit. */
  enter: () => Promise<void>;
  /** Spin up an ephemeral demo session for an unauthenticated visitor. */
  createAnonymous: () => Promise<void>;
  /** Restore origin user (if any) and delete the demo account. */
  exit: () => Promise<void>;
  /** True while one of the above mutations is in flight. */
  pending: boolean;
}

function throwNoProvider(): Promise<never> {
  throw new Error("useDemo: no DemoProvider mounted");
}

const NOOP_DEMO: DemoContextValue = {
  createAnonymous: throwNoProvider,
  enter: throwNoProvider,
  exit: throwNoProvider,
  isDemo: false,
  pending: false,
};

export const DemoContext = createContext<DemoContextValue>(NOOP_DEMO);

export function useDemo(): DemoContextValue {
  return useContext(DemoContext);
}

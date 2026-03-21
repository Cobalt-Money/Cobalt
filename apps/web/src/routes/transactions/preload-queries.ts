import { queries } from "@cobalt-web/zero";
import type { Zero } from "@rocicorp/zero";

import { CREDIT_SPENDING_PERIODS } from "./credit-periods";

/**
 * Preloads transaction query shapes when the Zero client is created — same pattern
 * as ztunes (`ZeroProvider` `init`), not `useEffect` in a child.
 *
 * @see https://github.com/rocicorp/ztunes/blob/main/app/components/zero-init.tsx
 */
export function preloadTransactionsQueries(z: Zero) {
  z.preload(queries.transactions.list());
  z.preload(queries.transactions.recurring());
  for (const period of CREDIT_SPENDING_PERIODS) {
    z.preload(queries.transactions.creditSpending({ period }));
  }
}

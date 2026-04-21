import { ConnectAccountEmpty as ConnectAccountEmptyPresentational } from "@cobalt-web/ui/cobalt/empty/connect-account-empty";
import type { ConnectAccountEmptyProps } from "@cobalt-web/ui/cobalt/empty/connect-account-empty";

import { useAddAccount } from "@/components/accounts/add-account-provider";

/**
 * App-level wrapper that wires the `Empty` CTA to the Plaid add-account flow.
 * Use this in `apps/web` surfaces where the user can link accounts directly.
 */
export function ConnectAccountEmpty(
  props: Omit<ConnectAccountEmptyProps, "onConnect">
) {
  const { openAddAccount } = useAddAccount();
  return (
    <ConnectAccountEmptyPresentational {...props} onConnect={openAddAccount} />
  );
}

import { AddAccountDialog } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/add-account-dialog";
import { useCallback, useEffect, useState } from "react";

import {
  useAccountLauncher,
  useInstitutionSearch,
} from "./use-add-account-flow";

export function AddAccountDialogHost({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: plaidInstitutions = [] } = useInstitutionSearch(
    searchQuery,
    open
  );

  const dismiss = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const { handleChoose } = useAccountLauncher(dismiss);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <AddAccountDialog
      onChoose={handleChoose}
      onOpenChange={onOpenChange}
      onSearchQueryChange={setSearchQuery}
      open={open}
      plaidInstitutions={plaidInstitutions}
      searchQuery={searchQuery}
    />
  );
}

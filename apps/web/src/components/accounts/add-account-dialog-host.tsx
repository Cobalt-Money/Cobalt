import { AddAccountDialog } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/add-account-dialog";
import { useCallback, useState } from "react";

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

  // Clear the search query as part of the close event — no need for an effect
  // reacting to `open` changes.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setSearchQuery("");
      }
      onOpenChange(next);
    },
    [onOpenChange]
  );

  const dismiss = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const { handleChoose, updateModeDialog } = useAccountLauncher(dismiss);

  return (
    <>
      <AddAccountDialog
        onChoose={handleChoose}
        onOpenChange={handleOpenChange}
        onSearchQueryChange={setSearchQuery}
        open={open}
        plaidInstitutions={plaidInstitutions}
        searchQuery={searchQuery}
      />
      {updateModeDialog}
    </>
  );
}

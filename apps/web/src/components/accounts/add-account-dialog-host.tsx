import { AddAccountDialog } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/add-account-dialog";
import type { AddAccountInstitution } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/types";
import { useCallback, useState } from "react";

import { useAddCashAccount } from "./add-cash-account-host";
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
  const { openAddCashAccount } = useAddCashAccount();
  const { data: plaidInstitutions = [] } = useInstitutionSearch(
    searchQuery,
    open
  );

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

  const { handleChoose: handleConnectChoose, updateModeDialog } =
    useAccountLauncher(dismiss);

  const handleChoose = useCallback(
    (institution: AddAccountInstitution) => {
      if (institution.provider === "manual") {
        handleOpenChange(false);
        openAddCashAccount();
        return;
      }
      handleConnectChoose(institution);
    },
    [handleConnectChoose, handleOpenChange, openAddCashAccount]
  );

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

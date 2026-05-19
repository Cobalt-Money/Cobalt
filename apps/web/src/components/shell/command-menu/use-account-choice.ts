import type { AddAccountInstitution } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/types";
import { useCallback, useState } from "react";

import { useOpenImportWizard } from "@/components/imports/import-wizard";

import type { PageStack } from "./use-page-stack";

interface UseAccountChoiceArgs {
  pageStack: PageStack;
  /** Called when the user picks "import CSV" — closes palette + opens wizard. */
  onClose: () => void;
  /** Clears the cmdk search input on every transition. */
  resetSearch: () => void;
}

/**
 * Owns the picker→form transition when adding an account. State sticks around
 * (selectedInstitution, cashEntry) so the downstream pages can prefill / lock
 * type. Routes to `add-manual-account` for cash + manual providers, or to
 * `link-or-manual` for Plaid/SnapTrade so the user can still opt to track
 * the account manually.
 */
export function useAccountChoice({ pageStack, onClose, resetSearch }: UseAccountChoiceArgs) {
  const openImportWizard = useOpenImportWizard();
  const [selectedInstitution, setSelectedInstitution] = useState<AddAccountInstitution | null>(
    null,
  );
  /** True when the manual-account form was entered via the Cash tile or "Create cash account" — locks type to depository. */
  const [cashEntry, setCashEntry] = useState(false);

  const chooseInstitution = useCallback(
    (institution: AddAccountInstitution) => {
      if (institution.id === "manual:import-csv") {
        onClose();
        openImportWizard();
        return;
      }
      resetSearch();
      if (institution.provider === "manual") {
        // Cash tile — no intermediate step, no prefill, lock type to depository.
        setSelectedInstitution(null);
        setCashEntry(true);
        pageStack.replaceTop("add-manual-account");
        return;
      }
      // Plaid/SnapTrade institution — give user choice between linking and tracking manually.
      // Stash the institution so the manual form can prefill name + logoDomain.
      setSelectedInstitution(institution);
      setCashEntry(false);
      pageStack.replaceTop("link-or-manual");
    },
    [onClose, openImportWizard, pageStack, resetSearch],
  );

  /** Switch to add-manual-account in cash mode (from "Create cash account" in the AddTransaction form). */
  const switchToCashAccount = useCallback(() => {
    setSelectedInstitution(null);
    setCashEntry(true);
    resetSearch();
    pageStack.replaceTop("add-manual-account");
  }, [pageStack, resetSearch]);

  /** Switch to add-manual-account keeping the currently selected institution (from LinkOrManual "Add manually"). */
  const switchToManualAccountForSelected = useCallback(() => {
    setCashEntry(false);
    resetSearch();
    pageStack.replaceTop("add-manual-account");
  }, [pageStack, resetSearch]);

  return {
    cashEntry,
    chooseInstitution,
    selectedInstitution,
    switchToCashAccount,
    switchToManualAccountForSelected,
  };
}

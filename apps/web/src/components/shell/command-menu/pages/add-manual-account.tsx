import { Icon } from "@cobalt-web/ui/components/icon";
import { AddManualAccountForm } from "@cobalt-web/ui/cobalt/accounts/add-manual-account-dialog";
import type { AddAccountInstitution } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/types";
import { Wallet01Icon } from "@hugeicons/core-free-icons";
import { useCallback, useMemo, useState } from "react";

import { useAddManualAccountSubmit } from "@/hooks/use-add-manual-account-submit";
import { useInstitutionSearch } from "@/components/accounts/use-add-account-flow";

interface Props {
  /** Institution selected on the prior step (null when entering via the Cash tile). */
  selectedInstitution: AddAccountInstitution | null;
  /** True when entered via Cash tile / "Create cash account" — locks type to depository. */
  cashEntry: boolean;
  /** Fired after a successful submit. Parent decides whether to pop or close. */
  onSuccess: () => void;
  /** Backspace on empty input pops back. */
  onBackspaceWhenEmpty: () => void;
}

/** Strip protocol/path/`www.` to get a bare domain suitable for Brandfetch CDN paths. */
function domainFromUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  let host = trimmed;
  if (trimmed.includes("://")) {
    try {
      ({ host } = new URL(trimmed));
    } catch {
      // fall through with raw string
    }
  } else {
    host = trimmed.split("/")[0] ?? trimmed;
  }
  return host.replace(/^www\./i, "") || null;
}

export function AddManualAccountPage({
  selectedInstitution,
  cashEntry,
  onSuccess,
  onBackspaceWhenEmpty,
}: Props) {
  const [institutionQuery, setInstitutionQuery] = useState("");
  const { data: institutionResults = [], isFetching: institutionLoading } = useInstitutionSearch(
    institutionQuery,
    true,
  );
  const institutionSearch = useMemo(
    () => ({
      loading: institutionLoading,
      onQueryChange: setInstitutionQuery,
      results: institutionResults.map((i) => ({
        id: i.id,
        logo: i.logo ?? null,
        name: i.name,
        url: i.url ?? null,
      })),
    }),
    [institutionResults, institutionLoading],
  );

  const { submit } = useAddManualAccountSubmit();

  const handleSubmit = useCallback(
    (values: Parameters<typeof submit>[0]) => {
      void (async () => {
        try {
          await submit(values);
          onSuccess();
        } catch {
          // Toast already shown by provider.
        }
      })();
    },
    [onSuccess, submit],
  );

  return (
    <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
      <h2 className="flex items-center gap-2 font-semibold text-foreground text-lg leading-none">
        <Icon className="shrink-0" icon={Wallet01Icon} size="lg" />
        Add an account
      </h2>
      <AddManualAccountForm
        initialLogoDomain={domainFromUrl(selectedInstitution?.url ?? null)}
        institutionSearch={institutionSearch}
        initialName={selectedInstitution?.name}
        initialType={cashEntry ? "depository" : undefined}
        onBackspaceWhenEmpty={onBackspaceWhenEmpty}
        onSubmit={handleSubmit}
        submitting={false}
      />
    </div>
  );
}

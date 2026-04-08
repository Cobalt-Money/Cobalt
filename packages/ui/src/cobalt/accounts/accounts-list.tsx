import { useMemo } from "react";

import { InstitutionLogo } from "../logos/institution-logo";
import { AccountCard } from "./account-card";
import type { AccountsFilter } from "./accounts-toolbar";
import {
  filterAccountCardsForToolbar,
  groupAccountCardsByInstitution,
} from "./lib/accounts-list-model";
import type { AccountCardViewModel } from "./lib/map-zero-to-account-cards";

export function AccountsList({
  activeFilter,
  isComplete,
  items,
}: {
  activeFilter: AccountsFilter;
  isComplete: boolean;
  items: AccountCardViewModel[];
}) {
  const visible = useMemo(
    () => filterAccountCardsForToolbar(items, activeFilter),
    [activeFilter, items]
  );

  const byInstitution = useMemo(
    () => groupAccountCardsByInstitution(visible),
    [visible]
  );

  return (
    <div className="pt-4 pb-4 sm:pt-6 sm:pb-6">
      {visible.length === 0 && isComplete ? (
        <div className="flex min-h-[min(42vh,360px)] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground">
            No accounts in this view
          </p>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Choose another filter or connect an account to see it here.
          </p>
        </div>
      ) : null}
      {visible.length > 0 ? (
        <div className="flex flex-col gap-10 sm:gap-12">
          {byInstitution.map(
            ({ institution, sectionAccounts }, sectionIndex) => {
              const [lead] = sectionAccounts;
              if (lead === undefined) {
                return null;
              }
              return (
                <section
                  key={institution}
                  aria-labelledby={`accounts-inst-${String(sectionIndex)}`}
                  className="min-w-0"
                >
                  <div className="mb-4 flex items-center gap-2.5 sm:mb-5">
                    <InstitutionLogo
                      className="size-7 shrink-0 sm:size-8"
                      institutionLogo={lead.institutionLogo}
                      institutionLogosExtra={lead.institutionLogosExtra}
                      institutionName={lead.institution}
                      institutionUrl={lead.institutionUrl}
                    />
                    <h2
                      className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
                      id={`accounts-inst-${String(sectionIndex)}`}
                    >
                      {institution}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:gap-7 xl:grid-cols-3">
                    {sectionAccounts.map((account) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        institutionLogo={
                          <InstitutionLogo
                            className="size-8 shrink-0 sm:size-9"
                            institutionLogo={account.institutionLogo}
                            institutionLogosExtra={
                              account.institutionLogosExtra
                            }
                            institutionName={account.institution}
                            institutionUrl={account.institutionUrl}
                          />
                        }
                      />
                    ))}
                  </div>
                </section>
              );
            }
          )}
        </div>
      ) : null}
    </div>
  );
}

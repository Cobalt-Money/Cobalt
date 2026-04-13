"use client";

import {
  formatLastSyncedLabel,
  formatLastSyncedTitle,
} from "@cobalt-web/ui/cobalt/accounts/lib/format-last-synced";
import { InstitutionLogo } from "@cobalt-web/ui/cobalt/logos/institution-logo";
import { Button } from "@cobalt-web/ui/components/button";
import { Card, CardContent, CardFooter } from "@cobalt-web/ui/components/card";
import { ArrowReloadHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface MockAccount {
  id: string;
  description: string;
  institution: string;
  institutionUrl: string | null;
  institutionLogo: string | null;
  accountTypeLabel: string;
  mask: string;
  lastSyncedAt: number | null;
}

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    accountTypeLabel: "Checking",
    description: "Chase Total Checking",
    id: "1",
    institution: "Chase",
    institutionLogo: null,
    institutionUrl: "chase.com",
    lastSyncedAt: Date.now() - 1000 * 60 * 60 * 24,
    mask: "0000",
  },
  {
    accountTypeLabel: "Credit Card",
    description: "Chase Sapphire Preferred",
    id: "3",
    institution: "Chase",
    institutionLogo: null,
    institutionUrl: "chase.com",
    lastSyncedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    mask: "3333",
  },
  {
    accountTypeLabel: "Brokerage",
    description: "Individual Brokerage",
    id: "4",
    institution: "Fidelity",
    institutionLogo: null,
    institutionUrl: "fidelity.com",
    lastSyncedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    mask: "7788",
  },
  {
    accountTypeLabel: "Roth IRA",
    description: "Roth IRA",
    id: "5",
    institution: "Fidelity",
    institutionLogo: null,
    institutionUrl: "fidelity.com",
    lastSyncedAt: Date.now() - 1000 * 60 * 60 * 24,
    mask: "4421",
  },
];

interface InstitutionGroup {
  institution: string;
  institutionUrl: string | null;
  institutionLogo: string | null;
  accounts: MockAccount[];
}

function groupByInstitution(accounts: MockAccount[]): InstitutionGroup[] {
  const map = new Map<string, InstitutionGroup>();
  for (const account of accounts) {
    const existing = map.get(account.institution);
    if (existing) {
      existing.accounts.push(account);
    } else {
      map.set(account.institution, {
        accounts: [account],
        institution: account.institution,
        institutionLogo: account.institutionLogo,
        institutionUrl: account.institutionUrl,
      });
    }
  }
  return [...map.values()].toSorted((a, b) =>
    a.institution.localeCompare(b.institution)
  );
}

const groups = groupByInstitution(MOCK_ACCOUNTS);

export function BabyAccounts() {
  return (
    <div className="px-4 pt-4 pb-4 sm:pt-6 sm:pb-6">
      <div className="flex flex-col gap-10 sm:gap-12">
        {groups.map((group, sectionIndex) => (
          <section
            key={group.institution}
            aria-labelledby={`baby-accounts-inst-${String(sectionIndex)}`}
            className="min-w-0"
          >
            <div className="mb-4 flex items-center gap-2.5 sm:mb-5">
              <InstitutionLogo
                className="size-6 shrink-0 sm:size-7"
                institutionLogo={group.institutionLogo}
                institutionName={group.institution}
                institutionUrl={group.institutionUrl}
              />
              <h2
                className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
                id={`baby-accounts-inst-${String(sectionIndex)}`}
              >
                {group.institution}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:gap-7 xl:grid-cols-3">
              {group.accounts.map((account) => (
                <Card
                  key={account.id}
                  className="flex min-h-[160px] flex-col gap-0 rounded-2xl border-0 bg-[oklch(0.949_0_0)] py-0 shadow-none ring-0 dark:bg-white/[0.06]"
                >
                  <CardContent className="flex flex-1 flex-col px-4 pt-3 pb-0 sm:px-5 sm:pt-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3
                        className="min-w-0 max-w-[min(100%,calc(100%-3.5rem))] text-base font-semibold tracking-tight text-foreground sm:text-lg"
                        title={account.description}
                      >
                        {account.description}
                      </h3>
                      <InstitutionLogo
                        className="size-8 shrink-0 sm:size-9"
                        institutionLogo={account.institutionLogo}
                        institutionName={account.institution}
                        institutionUrl={account.institutionUrl}
                      />
                    </div>
                    <p
                      aria-label={`Account ending in ${account.mask}`}
                      className="mt-4 flex flex-wrap items-baseline gap-x-2 text-lg font-semibold leading-snug tabular-nums tracking-tight sm:mt-5 sm:text-xl"
                      title={`Ending in ${account.mask}`}
                    >
                      <span
                        aria-hidden
                        className="select-none font-mono tracking-widest text-muted-foreground"
                      >
                        **** **** ****
                      </span>
                      <span className="font-bold tracking-normal text-foreground tabular-nums">
                        {account.mask}
                      </span>
                    </p>
                  </CardContent>
                  <CardFooter className="mt-auto flex w-full min-w-0 flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-1">
                      <Button
                        className="h-auto justify-start px-0 py-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Reconnect
                      </Button>
                      <Button
                        className="h-auto justify-start px-0 py-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-destructive"
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Disconnect
                      </Button>
                    </div>
                    <p
                      aria-label={
                        account.lastSyncedAt === null
                          ? "Never synced"
                          : `Last synced ${formatLastSyncedLabel(account.lastSyncedAt)}`
                      }
                      className="flex shrink-0 items-center justify-end gap-1.5 text-right text-sm font-normal text-muted-foreground"
                    >
                      <HugeiconsIcon
                        aria-hidden
                        className="size-5 shrink-0 text-muted-foreground"
                        icon={ArrowReloadHorizontalIcon}
                        strokeWidth={2}
                      />
                      {account.lastSyncedAt === null ? (
                        <span className="tabular-nums">—</span>
                      ) : (
                        <time
                          className="tabular-nums"
                          dateTime={new Date(
                            account.lastSyncedAt
                          ).toISOString()}
                          title={formatLastSyncedTitle(account.lastSyncedAt)}
                        >
                          {formatLastSyncedLabel(account.lastSyncedAt)}
                        </time>
                      )}
                    </p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

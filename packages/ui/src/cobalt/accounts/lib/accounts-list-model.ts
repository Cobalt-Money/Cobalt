import type { AccountsFilter } from "../accounts-toolbar";
import type { AccountCardViewModel } from "./map-zero-to-account-cards";

export interface AccountsInstitutionSection {
  institution: string;
  sectionAccounts: AccountCardViewModel[];
}

export function filterAccountCardsForToolbar(
  items: readonly AccountCardViewModel[],
  activeFilter: AccountsFilter
): AccountCardViewModel[] {
  if (activeFilter === "all") {
    return [...items];
  }
  return items.filter((a) => a.category === activeFilter);
}

export function groupAccountCardsByInstitution(
  visible: readonly AccountCardViewModel[]
): AccountsInstitutionSection[] {
  const map = new Map<string, AccountCardViewModel[]>();
  for (const account of visible) {
    const key = account.institution;
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(account);
    } else {
      map.set(key, [account]);
    }
  }
  return [...map.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([institution, sectionAccounts]) => ({
      institution,
      sectionAccounts,
    }));
}

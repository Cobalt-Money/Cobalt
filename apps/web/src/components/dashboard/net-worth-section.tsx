import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { brokerageInstitutionBranding } from "@cobalt-web/ui/cobalt/logos/brokerage-institution-branding";
import { InstitutionLogo } from "@cobalt-web/ui/cobalt/logos/institution-logo";
import { Button } from "@cobalt-web/ui/components/button";
import type { ChartConfig } from "@cobalt-web/ui/components/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import { PrivateAmount } from "@cobalt-web/ui/components/privacy";
import { usePrivacy } from "@cobalt-web/ui/hooks/use-privacy";
import { cn } from "@cobalt-web/ui/lib/utils";
import { queries } from "@cobalt-web/zero";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { AllocationDonutChart } from "@/components/dashboard/net-worth-donut-chart";
import { NetWorthSectionSkeleton } from "@/components/dashboard/skeletons/net-worth-section-skeleton";
import { ConnectAccountEmpty } from "@/components/empty/connect-account-empty";

// ── Formatters ────────────────────────────────────────────────────

const formatUsdInteger = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

// ── Types ────────────────────────────────────────────────────────

const TIME_RANGES = ["1W", "1M", "1Y", "All"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const CATEGORY_COLORS = {
  checking: "#3b82f6",
  credit: "#ec4899",
  investments: "#38bdf8",
  loans: "#f97316",
  savings: "#6366f1",
} as const;

interface BankSnapshotRow {
  accountId: string;
  snapshotDate: number;
  current?: number | null;
  account?: {
    type?: string | null;
    subtype?: string | null;
    name?: string | null;
    connection?: {
      institutionName?: string | null;
      institutionLogo?: string | null;
      institution?: {
        logo?: string | null;
        url?: string | null;
        name?: string | null;
      } | null;
    } | null;
  } | null;
}

interface PortfolioSnapshotRow {
  accountId?: string | null;
  snapshotDate: number;
  current?: number | null;
  accountName?: string | null;
  institutionName?: string | null;
}

// ── Account scope ─────────────────────────────────────────────────

type AccountGroup = "bank" | "checking" | "savings" | "loans" | "investments";

type AccountScope =
  | { type: "all" }
  | { type: "group"; group: AccountGroup }
  | { type: "bank"; plaidAccountId: string }
  | { type: "portfolio"; accountKey: string };

const GROUP_LABELS: Record<AccountGroup, string> = {
  bank: "Bank accounts",
  checking: "Checking",
  investments: "Investments",
  loans: "Loans",
  savings: "Savings",
};

interface BankAccountEntry {
  plaidAccountId: string;
  name: string;
  type: string;
  subtype?: string | null;
  institutionName?: string | null;
  institutionLogo?: string | null;
  institutionUrl?: string | null;
}

interface PortfolioAccountEntry {
  accountKey: string;
  name: string;
  institutionName?: string | null;
  institutionLogo?: string | null;
  institutionLogosExtra?: readonly string[] | null;
  institutionUrl?: string | null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface ChartPoint {
  label: string;
  fullLabel: string;
  value: number;
}

// ── Snapshot aggregation ─────────────────────────────────────────

/**
 * Returns epoch-ms cutoff for the given range.
 * "All" → null (no cutoff).
 */
function rangeCutoff(range: TimeRange): number | null {
  const now = Date.now();
  if (range === "1W") {
    return now - 7 * 24 * 60 * 60 * 1000;
  }
  if (range === "1M") {
    return now - 30 * 24 * 60 * 60 * 1000;
  }
  if (range === "1Y") {
    return now - 365 * 24 * 60 * 60 * 1000;
  }
  return null;
}

/** ISO week start (Monday) for a given date, as YYYY-MM-DD. */
function weekStartKey(d: Date): string {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
}

function getBucketKey(ts: number, range: TimeRange): string {
  const d = new Date(ts);
  if (range === "1W") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  if (range === "1M") {
    return weekStartKey(d);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function bucketLabels(
  key: string,
  range: TimeRange
): { label: string; fullLabel: string } {
  if (range === "1W") {
    const [y, m, day] = key.split("-").map(Number);
    const d = new Date(y, (m ?? 1) - 1, day);
    const dayName = DAY_LABELS[d.getDay()] ?? key;
    const monthName = MONTH_LABELS[(m ?? 1) - 1] ?? "";
    return {
      fullLabel: `${dayName}, ${monthName} ${day}`,
      label: dayName,
    };
  }
  if (range === "1M") {
    const [, m, day] = key.split("-").map(Number);
    const monthName = MONTH_LABELS[(m ?? 1) - 1] ?? "";
    return {
      fullLabel: `Week of ${monthName} ${day}`,
      label: `${monthName} ${day}`,
    };
  }
  const [year, monthNum] = key.split("-");
  const label = MONTH_LABELS[Number(monthNum) - 1] ?? key;
  return { fullLabel: `${label} ${year}`, label };
}

/**
 * Aggregate bank + portfolio snapshots into a net-worth series.
 *
 * Granularity depends on range:
 *  - 1W  → one bar per day
 *  - 1M → one bar per week (Monday-anchored)
 *  - 1Y / All → one bar per month
 *
 * For each bucket, takes the last snapshot per account → sums (depository – credit + investments).
 */
type BankBucketMap = Map<
  string,
  Map<string, { balance: number; type: string; date: number }>
>;
type PortfolioBucketMap = Map<
  string,
  Map<string, { totalValue: number; date: number }>
>;

function buildBankBuckets(
  snapshots: BankSnapshotRow[],
  range: TimeRange
): BankBucketMap {
  const byBucket: BankBucketMap = new Map();
  for (const snap of snapshots) {
    const key = getBucketKey(snap.snapshotDate, range);
    if (!byBucket.has(key)) {
      byBucket.set(key, new Map());
    }
    const accMap = byBucket.get(key);
    const existing = accMap?.get(snap.accountId);
    if (!existing || snap.snapshotDate > existing.date) {
      accMap?.set(snap.accountId, {
        balance: snap.current ?? 0,
        date: snap.snapshotDate,
        type: snap.account?.type ?? "depository",
      });
    }
  }
  return byBucket;
}

function buildPortfolioBuckets(
  snapshots: PortfolioSnapshotRow[],
  range: TimeRange
): PortfolioBucketMap {
  const byBucket: PortfolioBucketMap = new Map();
  for (const snap of snapshots) {
    const key = getBucketKey(snap.snapshotDate, range);
    const accountKey = snap.accountId ?? "unknown";
    if (!byBucket.has(key)) {
      byBucket.set(key, new Map());
    }
    const accMap = byBucket.get(key);
    const existing = accMap?.get(accountKey);
    if (!existing || snap.snapshotDate > existing.date) {
      accMap?.set(accountKey, {
        date: snap.snapshotDate,
        totalValue: snap.current ?? 0,
      });
    }
  }
  return byBucket;
}

function buildNetWorthSeries(
  bankSnapshots: BankSnapshotRow[],
  portfolioSnapshots: PortfolioSnapshotRow[],
  since: number | null,
  range: TimeRange
): ChartPoint[] {
  const filteredBank = since
    ? bankSnapshots.filter((s) => s.snapshotDate >= since)
    : bankSnapshots;
  const filteredPortfolio = since
    ? portfolioSnapshots.filter((s) => s.snapshotDate >= since)
    : portfolioSnapshots;

  const bankByBucket = buildBankBuckets(filteredBank, range);
  const portfolioByBucket = buildPortfolioBuckets(filteredPortfolio, range);

  const allKeys = new Set([
    ...bankByBucket.keys(),
    ...portfolioByBucket.keys(),
  ]);

  return [...allKeys]
    .toSorted() // lexicographic = chronological for all key formats
    .map((key) => {
      let bankNet = 0;
      for (const { balance, type } of bankByBucket.get(key)?.values() ?? []) {
        bankNet += type === "credit" || type === "loan" ? -balance : balance;
      }

      let portfolioTotal = 0;
      for (const { totalValue } of portfolioByBucket.get(key)?.values() ?? []) {
        portfolioTotal += totalValue;
      }

      return {
        ...bucketLabels(key, range),
        value: bankNet + portfolioTotal,
      };
    });
}

// ── Account scope picker ──────────────────────────────────────────

function scopeLabel(
  scope: AccountScope,
  bankAccounts: BankAccountEntry[],
  portfolioAccounts: PortfolioAccountEntry[]
): string {
  if (scope.type === "all") {
    return "All accounts";
  }
  if (scope.type === "group") {
    return GROUP_LABELS[scope.group];
  }
  if (scope.type === "bank") {
    return (
      bankAccounts.find((a) => a.plaidAccountId === scope.plaidAccountId)
        ?.name ?? "Account"
    );
  }
  return (
    portfolioAccounts.find((a) => a.accountKey === scope.accountKey)?.name ??
    "Account"
  );
}

type NavSection = "bank" | "investments";

function scopeNavSection(scope: AccountScope): NavSection {
  if (scope.type === "portfolio") {
    return "investments";
  }
  if (scope.type === "group" && scope.group === "investments") {
    return "investments";
  }
  return "bank";
}

function NetWorthScopePicker({
  bankAccounts,
  portfolioAccounts,
  scope,
  onScopeChange,
}: {
  bankAccounts: BankAccountEntry[];
  portfolioAccounts: PortfolioAccountEntry[];
  scope: AccountScope;
  onScopeChange: (s: AccountScope) => void;
}) {
  const [nav, setNav] = useState<NavSection>(() => scopeNavSection(scope));
  const label = scopeLabel(scope, bankAccounts, portfolioAccounts);
  const hasAccounts = bankAccounts.length > 0 || portfolioAccounts.length > 0;
  if (!hasAccounts) {
    return null;
  }

  const navItemClass = (active: boolean) =>
    cn(
      "flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-xs transition-colors",
      active
        ? "bg-accent text-foreground font-medium"
        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
    );

  const rightItemClass = (active: boolean) =>
    cn("rounded-lg px-3 py-2 text-xs", active && "bg-accent font-medium");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="max-w-[min(15rem,calc(100vw-2.5rem))] justify-between gap-2 font-normal"
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        <span className="truncate">{label}</span>
        <HugeiconsIcon
          className="text-muted-foreground shrink-0"
          icon={ArrowDown01Icon}
          size={16}
          strokeWidth={2}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border-0 bg-popover/98 p-0 shadow-md ring-0 backdrop-blur-sm"
        side="bottom"
        sideOffset={8}
      >
        <div className="flex min-h-[160px]">
          {/* Left nav */}
          <div className="flex w-36 shrink-0 flex-col gap-0.5 p-1.5">
            <DropdownMenuItem
              className={rightItemClass(scope.type === "all")}
              onClick={() => onScopeChange({ type: "all" })}
            >
              All accounts
            </DropdownMenuItem>
            {bankAccounts.length > 0 && (
              <button
                className={navItemClass(nav === "bank")}
                onClick={() => setNav("bank")}
                type="button"
              >
                Bank accounts
              </button>
            )}
            {portfolioAccounts.length > 0 && (
              <button
                className={navItemClass(nav === "investments")}
                onClick={() => setNav("investments")}
                type="button"
              >
                Investments
              </button>
            )}
          </div>

          {/* Right content */}
          <div className="bg-muted/40 flex min-w-0 flex-1 flex-col gap-0.5 overflow-y-auto rounded-xl p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nav === "bank" && (
              <>
                {(["bank", "checking", "savings", "loans"] as const).map(
                  (g) => (
                    <DropdownMenuItem
                      className={rightItemClass(
                        scope.type === "group" && scope.group === g
                      )}
                      key={g}
                      onClick={() => onScopeChange({ group: g, type: "group" })}
                    >
                      {GROUP_LABELS[g]}
                    </DropdownMenuItem>
                  )
                )}
                {bankAccounts.length > 0 && (
                  <>
                    <div className="border-border/40 my-1 border-t" />
                    {bankAccounts.map((acc) => (
                      <DropdownMenuItem
                        className={rightItemClass(
                          scope.type === "bank" &&
                            scope.plaidAccountId === acc.plaidAccountId
                        )}
                        key={acc.plaidAccountId}
                        onClick={() =>
                          onScopeChange({
                            plaidAccountId: acc.plaidAccountId,
                            type: "bank",
                          })
                        }
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <InstitutionLogo
                            className="size-5 shrink-0 overflow-hidden rounded-full"
                            institutionLogo={acc.institutionLogo}
                            institutionName={acc.institutionName ?? acc.name}
                            institutionUrl={acc.institutionUrl ?? null}
                          />
                          <span className="truncate">{acc.name}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </>
            )}

            {nav === "investments" && (
              <>
                <DropdownMenuItem
                  className={rightItemClass(
                    scope.type === "group" && scope.group === "investments"
                  )}
                  onClick={() =>
                    onScopeChange({ group: "investments", type: "group" })
                  }
                >
                  All investments
                </DropdownMenuItem>
                {portfolioAccounts.length > 0 && (
                  <>
                    <div className="border-border/40 my-1 border-t" />
                    {portfolioAccounts.map((acc) => (
                      <DropdownMenuItem
                        className={rightItemClass(
                          scope.type === "portfolio" &&
                            scope.accountKey === acc.accountKey
                        )}
                        key={acc.accountKey}
                        onClick={() =>
                          onScopeChange({
                            accountKey: acc.accountKey,
                            type: "portfolio",
                          })
                        }
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <InstitutionLogo
                            className="size-5 shrink-0 overflow-hidden rounded-full"
                            institutionLogo={acc.institutionLogo}
                            institutionLogosExtra={acc.institutionLogosExtra}
                            institutionName={acc.institutionName ?? acc.name}
                            institutionUrl={acc.institutionUrl ?? null}
                          />
                          <div className="min-w-0">
                            <p className="truncate">{acc.name}</p>
                            {acc.institutionName ? (
                              <p className="text-muted-foreground truncate text-[10px]">
                                {acc.institutionName}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ConnectionField = NonNullable<
  NonNullable<BankSnapshotRow["account"]>["connection"]
>;

function institutionFieldsFromConnection(
  conn: ConnectionField | null | undefined
) {
  const inst = conn?.institution;
  return {
    institutionLogo:
      inst?.logo?.trim() || conn?.institutionLogo?.trim() || null,
    institutionName:
      inst?.name?.trim() || conn?.institutionName?.trim() || null,
    institutionUrl: inst?.url?.trim() || null,
  };
}

function bankEntryFromSnapshot(s: BankSnapshotRow): BankAccountEntry | null {
  if (!s.account?.name) {
    return null;
  }
  return {
    ...institutionFieldsFromConnection(s.account.connection),
    name: s.account.name,
    plaidAccountId: s.accountId,
    subtype: s.account.subtype,
    type: s.account.type ?? "depository",
  };
}

// ── Component ─────────────────────────────────────────────────────

export function NetWorthSection() {
  const [range, setRange] = useState<TimeRange>("1Y");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [categoryHover, setCategoryHover] = useState<number | null>(null);
  const [scope, setScope] = useState<AccountScope>({ type: "all" });
  const { mask } = usePrivacy();

  // Snapshot history — drives both the chart and headline totals
  const [rawBankSnapshots, bankResult] = useQuery(
    queries.accounts.bankBalanceSnapshots()
  );
  const [rawPortfolioSnapshots, portfolioResult] = useQuery(
    queries.brokerage.portfolioSnapshots()
  );
  const allBankSnapshots = rawBankSnapshots as unknown as BankSnapshotRow[];
  const allPortfolioSnapshots =
    rawPortfolioSnapshots as unknown as PortfolioSnapshotRow[];

  const isDataComplete =
    bankResult.type === "complete" && portfolioResult.type === "complete";

  // ── Unique account lists for the picker ──────────────────────────

  const bankAccountEntries = useMemo((): BankAccountEntry[] => {
    const seen = new Map<string, BankAccountEntry>();
    for (const s of allBankSnapshots) {
      if (!seen.has(s.accountId)) {
        const entry = bankEntryFromSnapshot(s);
        if (entry) {
          seen.set(s.accountId, entry);
        }
      }
    }
    return [...seen.values()];
  }, [allBankSnapshots]);

  const portfolioAccountEntries = useMemo((): PortfolioAccountEntry[] => {
    const seen = new Map<string, PortfolioAccountEntry>();
    for (const s of allPortfolioSnapshots) {
      const key = s.accountId ?? null;
      if (key && !seen.has(key)) {
        const branding = brokerageInstitutionBranding({
          institutionName: s.institutionName ?? null,
        });
        seen.set(key, {
          accountKey: key,
          institutionLogo: branding.institutionLogo,
          institutionLogosExtra: branding.institutionLogosExtra,
          institutionName: s.institutionName ?? null,
          institutionUrl: branding.institutionUrl,
          name: s.accountName ?? key,
        });
      }
    }
    return [...seen.values()];
  }, [allPortfolioSnapshots]);

  // ── Scoped snapshots ──────────────────────────────────────────────

  const bankSnapshots = useMemo(() => {
    if (scope.type === "all") {
      return allBankSnapshots;
    }
    if (scope.type === "bank") {
      return allBankSnapshots.filter(
        (s) => s.accountId === scope.plaidAccountId
      );
    }
    if (scope.type === "group") {
      if (scope.group === "investments") {
        return [];
      }
      if (scope.group === "bank") {
        return allBankSnapshots.filter((s) => s.account?.type === "depository");
      }
      if (scope.group === "checking") {
        return allBankSnapshots.filter(
          (s) =>
            s.account?.type === "depository" && s.account.subtype !== "savings"
        );
      }
      if (scope.group === "savings") {
        return allBankSnapshots.filter(
          (s) =>
            s.account?.type === "depository" && s.account.subtype === "savings"
        );
      }
      if (scope.group === "loans") {
        return allBankSnapshots.filter((s) => s.account?.type === "loan");
      }
    }
    return [];
  }, [allBankSnapshots, scope]);

  const portfolioSnapshots = useMemo(() => {
    if (scope.type === "all") {
      return allPortfolioSnapshots;
    }
    if (scope.type === "portfolio") {
      return allPortfolioSnapshots.filter(
        (s) => s.accountId === scope.accountKey
      );
    }
    if (scope.type === "group" && scope.group === "investments") {
      return allPortfolioSnapshots;
    }
    return [];
  }, [allPortfolioSnapshots, scope]);

  // ── Headline totals (latest snapshot per account) ────────────

  /** Snapshots from the single most recent snapshot day across all bank accounts. */
  const latestBankSnapshots = useMemo(() => {
    if (bankSnapshots.length === 0) {
      return [];
    }
    const newestDate = Math.max(...bankSnapshots.map((s) => s.snapshotDate));
    return bankSnapshots.filter((s) => s.snapshotDate === newestDate);
  }, [bankSnapshots]);

  /** Snapshots from the single most recent snapshot day across all portfolio accounts. */
  const latestPortfolioSnapshots = useMemo(() => {
    if (portfolioSnapshots.length === 0) {
      return [];
    }
    const newestDate = Math.max(
      ...portfolioSnapshots.map((s) => s.snapshotDate)
    );
    return portfolioSnapshots.filter((s) => s.snapshotDate === newestDate);
  }, [portfolioSnapshots]);

  const checkingTotal = useMemo(
    () =>
      latestBankSnapshots
        .filter(
          (s) =>
            s.account?.type === "depository" && s.account.subtype !== "savings"
        )
        .reduce((sum, s) => sum + (s.current ?? 0), 0),
    [latestBankSnapshots]
  );

  const savingsTotal = useMemo(
    () =>
      latestBankSnapshots
        .filter(
          (s) =>
            s.account?.type === "depository" && s.account.subtype === "savings"
        )
        .reduce((sum, s) => sum + (s.current ?? 0), 0),
    [latestBankSnapshots]
  );

  const depositoryTotal = checkingTotal + savingsTotal;

  const creditTotal = useMemo(
    () =>
      latestBankSnapshots
        .filter((s) => s.account?.type === "credit")
        .reduce((sum, s) => sum + (s.current ?? 0), 0),
    [latestBankSnapshots]
  );

  const loanTotal = useMemo(
    () =>
      latestBankSnapshots
        .filter((s) => s.account?.type === "loan")
        .reduce((sum, s) => sum + (s.current ?? 0), 0),
    [latestBankSnapshots]
  );

  const investmentTotal = useMemo(
    () =>
      latestPortfolioSnapshots.reduce((sum, s) => sum + (s.current ?? 0), 0),
    [latestPortfolioSnapshots]
  );

  const totalNetWorth =
    depositoryTotal + investmentTotal - creditTotal - loanTotal;

  // ── Historical chart ─────────────────────────────────────────

  const chartData = useMemo(
    () =>
      buildNetWorthSeries(
        bankSnapshots,
        portfolioSnapshots,
        rangeCutoff(range),
        range
      ),
    [bankSnapshots, portfolioSnapshots, range]
  );

  const yDomain = useMemo((): [number, number] => {
    if (chartData.length === 0) {
      return [0, 10_000];
    }
    const vals = chartData.map((d) => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.1 || max * 0.1;
    return [Math.max(0, min - pad), max + pad];
  }, [chartData]);

  // ── Categories donut ─────────────────────────────────────────

  const categoryBase =
    checkingTotal + savingsTotal + investmentTotal + creditTotal + loanTotal;

  const categories = useMemo(() => {
    if (categoryBase === 0) {
      return [];
    }
    const pct = (v: number) => Math.round((v / categoryBase) * 100);
    return [
      {
        color: CATEGORY_COLORS.checking,
        key: "checking",
        label: "Checking",
        pct: pct(checkingTotal),
        value: checkingTotal,
      },
      {
        color: CATEGORY_COLORS.savings,
        key: "savings",
        label: "Savings",
        pct: pct(savingsTotal),
        value: savingsTotal,
      },
      {
        color: CATEGORY_COLORS.investments,
        key: "investments",
        label: "Investments",
        pct: pct(investmentTotal),
        value: investmentTotal,
      },
      {
        color: CATEGORY_COLORS.credit,
        key: "credit",
        label: "Credit",
        pct: pct(creditTotal),
        value: creditTotal,
      },
      {
        color: CATEGORY_COLORS.loans,
        key: "loans",
        label: "Loans",
        pct: pct(loanTotal),
        value: loanTotal,
      },
    ]
      .filter((c) => c.value > 0)
      .toSorted((a, b) => b.pct - a.pct);
  }, [
    checkingTotal,
    savingsTotal,
    investmentTotal,
    creditTotal,
    loanTotal,
    categoryBase,
  ]);

  const categoryDonutConfig = useMemo((): ChartConfig => {
    const out: Record<string, { color: string; label: string }> = {};
    for (const c of categories) {
      out[c.key] = { color: c.color, label: c.label };
    }
    return out;
  }, [categories]);

  const categoryDonutData = useMemo(
    () => categories.map((c) => ({ name: c.key, value: c.pct })),
    [categories]
  );

  const categoryCenterValue =
    categoryHover === null
      ? undefined
      : mask(formatUsdInteger(categories[categoryHover]?.value ?? 0));

  // ── Render ───────────────────────────────────────────────────

  if (
    !isDataComplete &&
    allBankSnapshots.length === 0 &&
    allPortfolioSnapshots.length === 0
  ) {
    return <NetWorthSectionSkeleton />;
  }

  return (
    <section aria-label="Net worth overview" className="w-full min-w-0">
      <CobaltCard className="overflow-hidden rounded-3xl py-3">
        <CardContent className="p-0">
          <div className="flex flex-col lg:min-h-[380px] lg:flex-row lg:items-stretch">
            {/* Net worth history chart */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-5 sm:gap-5 sm:px-6">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-foreground text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                    <PrivateAmount>
                      {formatUsdInteger(
                        hoverIndex === null
                          ? totalNetWorth
                          : (chartData[hoverIndex]?.value ?? totalNetWorth)
                      )}
                    </PrivateAmount>
                  </p>
                </div>
                <NetWorthScopePicker
                  bankAccounts={bankAccountEntries}
                  onScopeChange={(s) => {
                    setScope(s);
                    setHoverIndex(null);
                  }}
                  portfolioAccounts={portfolioAccountEntries}
                  scope={scope}
                />
              </div>

              <div
                aria-label="Chart time range"
                className="flex flex-wrap gap-1"
                role="toolbar"
              >
                {TIME_RANGES.map((t) => {
                  const selected = range === t;
                  return (
                    <Button
                      aria-pressed={selected}
                      className="h-8 shrink-0 rounded-full px-3 text-xs font-medium"
                      key={t}
                      onClick={() => setRange(t)}
                      size="sm"
                      type="button"
                      variant={selected ? "outline" : "ghost"}
                    >
                      {t}
                    </Button>
                  );
                })}
              </div>

              <div className="text-muted-foreground min-h-[200px] w-full min-w-0 flex-1 sm:min-h-[220px] [&_.recharts-cartesian-axis-tick-value]:tabular-nums">
                {chartData.length === 0 ? (
                  <ConnectAccountEmpty
                    className="h-full border-0"
                    description="Connect a bank or brokerage and we'll start tracking your net worth over time."
                    title="No snapshot history yet"
                  />
                ) : (
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart
                      barCategoryGap="12%"
                      data={chartData}
                      margin={{ bottom: 4, left: 4, right: 8, top: 8 }}
                    >
                      <XAxis
                        axisLine={false}
                        dataKey="label"
                        interval={0}
                        tick={{
                          fill: "var(--muted-foreground)",
                          fontSize: 10,
                          fontWeight: 500,
                        }}
                        tickLine={false}
                      />
                      <YAxis domain={yDomain} hide />
                      <Bar
                        dataKey="value"
                        isAnimationActive={false}
                        maxBarSize={40}
                        onMouseEnter={(_, index) => setHoverIndex(index)}
                        onMouseLeave={() => setHoverIndex(null)}
                        radius={[12, 12, 12, 12]}
                      >
                        {chartData.map((row, i) => (
                          <Cell
                            fill="var(--color-green-550)"
                            fillOpacity={
                              hoverIndex !== null && i !== hoverIndex ? 0.2 : 1
                            }
                            key={row.fullLabel}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Categories donut */}
            <div
              className={cn(
                "border-border/60 flex w-full shrink-0 flex-col gap-4 border-t px-5 sm:px-6",
                "lg:w-[min(100%,20rem)] lg:border-t-0 lg:border-l"
              )}
              onMouseLeave={() => setCategoryHover(null)}
            >
              <p className="text-muted-foreground text-sm font-medium">
                Categories
              </p>

              {categories.length === 0 ? (
                <ConnectAccountEmpty
                  className="flex-1 border-0"
                  description="Link an account to see your allocation across categories."
                  title="No accounts connected"
                />
              ) : (
                <>
                  <div className="flex justify-center">
                    <AllocationDonutChart
                      centerValue={categoryCenterValue}
                      className="max-w-[min(100%,220px)]"
                      config={categoryDonutConfig}
                      data={categoryDonutData}
                      highlightedIndex={categoryHover}
                      muteOpacity={0.22}
                      onHighlightedIndexChange={setCategoryHover}
                      sizeClassName="h-[180px] w-full sm:h-[200px]"
                      sliceHighlight
                      tooltipDisabled
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-x-3 gap-y-3.5 text-sm">
                    {categories.map((c, i) => (
                      <div
                        className={cn(
                          "min-w-0 space-y-1 transition-opacity duration-150",
                          categoryHover !== null &&
                            categoryHover !== i &&
                            "opacity-[0.28]"
                        )}
                        key={c.key}
                        onMouseEnter={() => setCategoryHover(i)}
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            aria-hidden
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="text-muted-foreground truncate">
                            {c.label}
                          </span>
                        </div>
                        <p className="text-foreground pl-4 font-semibold tabular-nums">
                          {c.pct}%
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </CobaltCard>
    </section>
  );
}

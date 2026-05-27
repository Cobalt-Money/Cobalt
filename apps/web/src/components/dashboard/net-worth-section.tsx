import { CardContent, Card } from "@cobalt-web/ui/components/card";
import { ACCOUNT_CATEGORY_COLORS } from "@cobalt-web/ui/lib/account-palette";
import { AccountPicker } from "@cobalt-web/ui/cobalt/accounts/account-picker";
import type {
  AccountPickerAccount,
  AccountScope,
} from "@cobalt-web/ui/cobalt/accounts/account-picker";
import { brokerageInstitutionBranding } from "@cobalt-web/ui/cobalt/logos/brokerage-institution-branding";
import { Button } from "@cobalt-web/ui/components/button";
import type { ChartConfig } from "@cobalt-web/ui/components/chart";
import { PrivateAmount } from "@cobalt-web/ui/components/privacy";
import { usePrivacy } from "@cobalt-web/ui/hooks/use-privacy";
import { cn } from "@cobalt-web/ui/lib/utils";
import { queries } from "@cobalt-web/zero";
import type { Row, Snapshot } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo, useState } from "react";
import { BarChart } from "@cobalt-web/ui/components/charts/bar-chart";
import { Bar } from "@cobalt-web/ui/components/charts/bar";
import { BarXAxis } from "@cobalt-web/ui/components/charts/bar-x-axis";

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

type BankAccountRow = Row<typeof queries.accounts.bankAccounts>;

/** Snapshot row after client-side join with `bankAccounts` adds the `account` metadata. */
type BankSnapshotRow = Snapshot & {
  account?: Pick<BankAccountRow, "type" | "subtype" | "name"> | null;
};

/** Portfolio snapshot post client-side enrichment with brokerage account name/institution. */
type PortfolioSnapshotRow = Snapshot & {
  accountName?: string | null;
  institutionName?: string | null;
};

// ── Account scope ─────────────────────────────────────────────────

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

function bucketLabels(key: string, range: TimeRange): { label: string; fullLabel: string } {
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
type BankBucketMap = Map<string, Map<string, { balance: number; type: string; date: number }>>;
type PortfolioBucketMap = Map<string, Map<string, { totalValue: number; date: number }>>;

function buildBankBuckets(snapshots: readonly BankSnapshotRow[], range: TimeRange): BankBucketMap {
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
  snapshots: readonly PortfolioSnapshotRow[],
  range: TimeRange,
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
  bankSnapshots: readonly BankSnapshotRow[],
  portfolioSnapshots: readonly PortfolioSnapshotRow[],
  since: number | null,
  range: TimeRange,
): ChartPoint[] {
  const filteredBank = since ? bankSnapshots.filter((s) => s.snapshotDate >= since) : bankSnapshots;
  const filteredPortfolio = since
    ? portfolioSnapshots.filter((s) => s.snapshotDate >= since)
    : portfolioSnapshots;

  const bankByBucket = buildBankBuckets(filteredBank, range);
  const portfolioByBucket = buildPortfolioBuckets(filteredPortfolio, range);

  const allKeys = new Set([...bankByBucket.keys(), ...portfolioByBucket.keys()]);

  return [...allKeys]
    .toSorted() // lexicographic = chronological for all key formats
    .map((key) => {
      // snapshot.current is signed at write time (liabilities negative).
      // Net worth = plain sum across every account.
      let total = 0;
      for (const { balance } of bankByBucket.get(key)?.values() ?? []) {
        total += balance;
      }
      for (const { totalValue } of portfolioByBucket.get(key)?.values() ?? []) {
        total += totalValue;
      }
      return {
        ...bucketLabels(key, range),
        value: total,
      };
    });
}

// ── Connection helpers ────────────────────────────────────────────

type ConnectionField = NonNullable<BankAccountRow["plaidConnection"]>;

function institutionFieldsFromConnection(conn: ConnectionField | null | undefined) {
  const inst = conn?.institution;
  return {
    institutionLogo: inst?.logo?.trim() || conn?.institutionLogo?.trim() || null,
    institutionName: inst?.name?.trim() || conn?.institutionName?.trim() || null,
    institutionUrl: inst?.url?.trim() || null,
  };
}

function bankSublabel(type: string | null | undefined, subtype: string | null | undefined): string {
  if (type === "depository") {
    return subtype === "savings" ? "Savings" : "Checking";
  }
  if (type === "credit") {
    return "Credit";
  }
  if (type === "loan") {
    return "Loan";
  }
  return subtype ?? type ?? "";
}

// ── Component ─────────────────────────────────────────────────────

export function NetWorthSection() {
  const [range, setRange] = useState<TimeRange>("1Y");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [categoryHover, setCategoryHover] = useState<number | null>(null);
  const [scope, setScope] = useState<AccountScope>({ type: "all" });
  const { mask } = usePrivacy();

  // Snapshot history — drives both the chart and headline totals.
  // Range scoped server-side to cap IVM hydrate cost.
  const [rawBankSnapshots, bankResult] = useQuery(queries.accounts.bankBalanceSnapshots({ range }));
  const [rawPortfolioSnapshots, portfolioResult] = useQuery(
    queries.brokerage.portfolioSnapshots({ range }),
  );
  // Account metadata (type/subtype/name + institution chips) — pulled from
  // the small bankAccounts subscription. Snapshot query stays 0-relate so
  // its IVM pipeline is a single stage.
  const [allBankAccounts] = useQuery(queries.accounts.bankAccounts());
  const [snaptradeAccounts] = useQuery(queries.brokerage.accounts());
  const [plaidInvestmentAccounts] = useQuery(queries.brokerage.plaidInvestmentAccounts());
  const [manualInvestmentAccounts] = useQuery(queries.brokerage.manualInvestmentAccounts());

  const accountById = useMemo(() => {
    const m = new Map<string, BankAccountRow>();
    for (const a of allBankAccounts) {
      m.set(a.id, a);
    }
    return m;
  }, [allBankAccounts]);

  /** id → {name, institutionName} for snaptrade + plaid + manual investment accounts. */
  const brokerageMetaById = useMemo(() => {
    const m = new Map<string, { name: string | null; institutionName: string | null }>();
    for (const a of snaptradeAccounts) {
      m.set(a.id, { institutionName: a.institutionName ?? null, name: a.name ?? null });
    }
    for (const a of plaidInvestmentAccounts) {
      const inst =
        a.plaidConnection?.institution?.name ??
        a.plaidConnection?.institutionName ??
        a.institutionName ??
        null;
      m.set(a.id, { institutionName: inst, name: a.name ?? null });
    }
    for (const a of manualInvestmentAccounts) {
      m.set(a.id, { institutionName: a.institutionName ?? null, name: a.name ?? null });
    }
    return m;
  }, [snaptradeAccounts, plaidInvestmentAccounts, manualInvestmentAccounts]);

  // Attach account metadata (type/subtype/name) to each snapshot row by
  // joining with the bankAccounts map. Equivalent to the `.related("account")`
  // we used to ship server-side, but free of IVM cost.
  const allBankSnapshots = useMemo<BankSnapshotRow[]>(
    () =>
      rawBankSnapshots.map((s) => {
        const acc = accountById.get(s.accountId);
        return {
          ...s,
          account: acc
            ? {
                name: acc.name ?? null,
                subtype: acc.subtype ?? null,
                type: acc.type ?? null,
              }
            : null,
        };
      }),
    [rawBankSnapshots, accountById],
  );

  /** Portfolio snapshots enriched with brokerage account name + institution from the join map. */
  const allPortfolioSnapshots = useMemo<PortfolioSnapshotRow[]>(
    () =>
      rawPortfolioSnapshots.map((s) => {
        const meta = brokerageMetaById.get(s.accountId);
        return {
          ...s,
          accountName: meta?.name ?? null,
          institutionName: meta?.institutionName ?? null,
        };
      }),
    [rawPortfolioSnapshots, brokerageMetaById],
  );

  const isDataComplete = bankResult.type === "complete" && portfolioResult.type === "complete";

  // ── Unified account list for the picker ──────────────────────────

  const pickerAccounts = useMemo((): AccountPickerAccount[] => {
    const out: AccountPickerAccount[] = [];
    for (const a of allBankAccounts) {
      if (!a.name) {
        continue;
      }
      const inst = institutionFieldsFromConnection(a.plaidConnection);
      out.push({
        id: a.id,
        institutionLogo: inst.institutionLogo,
        institutionName: inst.institutionName ?? a.name,
        institutionUrl: inst.institutionUrl,
        name: a.name,
        sublabel: bankSublabel(a.type ?? "depository", a.subtype),
      });
    }
    const seen = new Set<string>();
    for (const s of allPortfolioSnapshots) {
      const key = s.accountId;
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      const branding = brokerageInstitutionBranding({
        institutionName: s.institutionName ?? null,
      });
      out.push({
        id: key,
        institutionLogo: branding.institutionLogo,
        institutionLogosExtra: branding.institutionLogosExtra,
        institutionName: s.institutionName ?? s.accountName ?? "Investments",
        institutionUrl: branding.institutionUrl,
        name: s.accountName ?? key,
        sublabel: "Investments",
      });
    }
    return out;
  }, [allBankAccounts, allPortfolioSnapshots]);

  // ── Scoped snapshots ──────────────────────────────────────────────

  const includedIds = useMemo<Set<string> | null>(
    () => (scope.type === "all" ? null : new Set(scope.accountIds)),
    [scope],
  );

  const bankSnapshots = useMemo(() => {
    if (!includedIds) {
      return allBankSnapshots;
    }
    return allBankSnapshots.filter((s) => includedIds.has(s.accountId));
  }, [allBankSnapshots, includedIds]);

  const portfolioSnapshots = useMemo(() => {
    if (!includedIds) {
      return allPortfolioSnapshots;
    }
    return allPortfolioSnapshots.filter((s) => includedIds.has(s.accountId));
  }, [allPortfolioSnapshots, includedIds]);

  // ── Headline totals (latest snapshot per account) ────────────

  /** Snapshots from the single most recent snapshot day across all bank accounts. */
  const latestBankSnapshots = useMemo(() => {
    // Source query is `orderBy("snapshotDate", "desc")` — index 0 is newest.
    const newestDate = bankSnapshots[0]?.snapshotDate;
    if (newestDate === undefined) {
      return [];
    }
    const out: BankSnapshotRow[] = [];
    for (const s of bankSnapshots) {
      if (s.snapshotDate !== newestDate) {
        break;
      }
      out.push(s);
    }
    return out;
  }, [bankSnapshots]);

  /** Snapshots from the single most recent snapshot day across all portfolio accounts. */
  const latestPortfolioSnapshots = useMemo(() => {
    const newestDate = portfolioSnapshots[0]?.snapshotDate;
    if (newestDate === undefined) {
      return [];
    }
    const out: PortfolioSnapshotRow[] = [];
    for (const s of portfolioSnapshots) {
      if (s.snapshotDate !== newestDate) {
        break;
      }
      out.push(s);
    }
    return out;
  }, [portfolioSnapshots]);

  const checkingTotal = useMemo(
    () =>
      latestBankSnapshots
        .filter((s) => s.account?.type === "depository" && s.account.subtype !== "savings")
        .reduce((sum, s) => sum + (s.current ?? 0), 0),
    [latestBankSnapshots],
  );

  const savingsTotal = useMemo(
    () =>
      latestBankSnapshots
        .filter((s) => s.account?.type === "depository" && s.account.subtype === "savings")
        .reduce((sum, s) => sum + (s.current ?? 0), 0),
    [latestBankSnapshots],
  );

  const depositoryTotal = checkingTotal + savingsTotal;

  const creditTotal = useMemo(
    () =>
      latestBankSnapshots
        .filter((s) => s.account?.type === "credit")
        .reduce((sum, s) => sum + (s.current ?? 0), 0),
    [latestBankSnapshots],
  );

  const loanTotal = useMemo(
    () =>
      latestBankSnapshots
        .filter((s) => s.account?.type === "loan")
        .reduce((sum, s) => sum + (s.current ?? 0), 0),
    [latestBankSnapshots],
  );

  const investmentTotal = useMemo(
    () => latestPortfolioSnapshots.reduce((sum, s) => sum + (s.current ?? 0), 0),
    [latestPortfolioSnapshots],
  );

  // snapshot.current is signed: assets positive, liabilities negative.
  // Net worth = plain sum across every category.
  const totalNetWorth = depositoryTotal + investmentTotal + creditTotal + loanTotal;
  // Liability magnitudes for "you owe $X" displays + donut percentages.
  const creditOwed = Math.abs(creditTotal);
  const loanOwed = Math.abs(loanTotal);

  // ── Historical chart ─────────────────────────────────────────

  const chartData = useMemo(
    () => buildNetWorthSeries(bankSnapshots, portfolioSnapshots, rangeCutoff(range), range),
    [bankSnapshots, portfolioSnapshots, range],
  );

  // ── Categories donut ─────────────────────────────────────────

  // Donut shows category share by magnitude — liabilities use absolute value
  // so credit / loan slices have positive width even though their snapshot
  // sign is negative.
  const categoryBase = checkingTotal + savingsTotal + investmentTotal + creditOwed + loanOwed;

  const categories = useMemo(() => {
    if (categoryBase === 0) {
      return [];
    }
    const pct = (v: number) => Math.round((v / categoryBase) * 100);
    return [
      {
        color: ACCOUNT_CATEGORY_COLORS.checking,
        key: "checking",
        label: "Checking",
        pct: pct(checkingTotal),
        value: checkingTotal,
      },
      {
        color: ACCOUNT_CATEGORY_COLORS.savings,
        key: "savings",
        label: "Savings",
        pct: pct(savingsTotal),
        value: savingsTotal,
      },
      {
        color: ACCOUNT_CATEGORY_COLORS.investments,
        key: "investments",
        label: "Investments",
        pct: pct(investmentTotal),
        value: investmentTotal,
      },
      {
        color: ACCOUNT_CATEGORY_COLORS.credit,
        key: "credit",
        label: "Credit",
        pct: pct(creditOwed),
        value: creditOwed,
      },
      {
        color: ACCOUNT_CATEGORY_COLORS.loans,
        key: "loans",
        label: "Loans",
        pct: pct(loanOwed),
        value: loanOwed,
      },
    ]
      .filter((c) => c.value > 0)
      .toSorted((a, b) => b.pct - a.pct);
  }, [checkingTotal, savingsTotal, investmentTotal, creditOwed, loanOwed, categoryBase]);

  const categoryDonutConfig = useMemo((): ChartConfig => {
    const out: Record<string, { color: string; label: string }> = {};
    for (const c of categories) {
      out[c.key] = { color: c.color, label: c.label };
    }
    return out;
  }, [categories]);

  const categoryDonutData = useMemo(
    () => categories.map((c) => ({ name: c.key, value: c.pct })),
    [categories],
  );

  const categoryCenterValue =
    categoryHover === null
      ? undefined
      : mask(formatUsdInteger(categories[categoryHover]?.value ?? 0));

  // ── Render ───────────────────────────────────────────────────

  if (!isDataComplete && allBankSnapshots.length === 0 && allPortfolioSnapshots.length === 0) {
    return <NetWorthSectionSkeleton />;
  }

  return (
    <section aria-label="Net worth overview" className="w-full min-w-0">
      <Card variant="subtle" className="overflow-hidden rounded-3xl py-3">
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
                          : (chartData[hoverIndex]?.value ?? totalNetWorth),
                      )}
                    </PrivateAmount>
                  </p>
                </div>
                <AccountPicker
                  accounts={pickerAccounts}
                  onScopeChange={(s) => {
                    setScope(s);
                    setHoverIndex(null);
                  }}
                  scope={scope}
                  size="sm"
                />
              </div>

              <div aria-label="Chart time range" className="flex flex-wrap gap-1" role="toolbar">
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
                  <BarChart
                    aspectRatio="auto"
                    className="h-full"
                    data={chartData as unknown as Record<string, unknown>[]}
                    margin={{ bottom: 40, left: 4, right: 8, top: 8 }}
                    onHoveredIndexChange={setHoverIndex}
                    xDataKey="label"
                  >
                    <Bar
                      animate={false}
                      dataKey="value"
                      fadedOpacity={0.2}
                      fill="var(--color-green-550)"
                      lineCap={12}
                    />
                    <BarXAxis />
                  </BarChart>
                )}
              </div>
            </div>

            {/* Categories donut */}
            <div
              className={cn(
                "border-border/60 flex w-full shrink-0 flex-col gap-4 border-t px-5 sm:px-6",
                "lg:w-[min(100%,20rem)] lg:border-t-0 lg:border-l",
              )}
              onMouseLeave={() => setCategoryHover(null)}
            >
              <p className="text-muted-foreground text-sm font-medium">Categories</p>

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
                          categoryHover !== null && categoryHover !== i && "opacity-[0.28]",
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
                          <span className="text-muted-foreground truncate">{c.label}</span>
                        </div>
                        <p className="text-foreground pl-4 font-semibold tabular-nums">{c.pct}%</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

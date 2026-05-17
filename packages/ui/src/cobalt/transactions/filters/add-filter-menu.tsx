import { Button } from "@cobalt-web/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import { Calendar } from "@cobalt-web/ui/components/calendar";
import { Slider } from "@cobalt-web/ui/components/slider";
import { Toggle } from "@cobalt-web/ui/components/toggle";
import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  Activity03Icon,
  BankIcon,
  Calendar03Icon,
  DollarCircleIcon,
  FilterIcon,
  Folder01Icon,
  Tag01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState } from "react";

import { InstitutionLogo } from "../../logos/institution-logo";
import { CategoryIcon, resolveCategoryIcon, UNKNOWN_CATEGORY_ICON } from "../categories";
import { TagChip } from "../tags/tag-chip";
import type { TagOption } from "../tags/tag-picker";
import type { AmountFilterType, AmountFilterValue } from "./amount-filter";
import type { BankOption } from "./bank-filter";
import type { CategoryFilterOption } from "./category-filter";
import type { StatusFilterValue } from "./status-filter";

export type FilterKey = "amount" | "status" | "bank" | "tag" | "category" | "dates";

const SLIDER_MAX = 10_000;
const SLIDER_STEP = 10;

const STATUS_LABELS: Record<StatusFilterValue, string> = {
  all: "All",
  pending: "Pending",
  posted: "Posted",
};
const STATUS_ICON_SRC: Record<StatusFilterValue, string | null> = {
  all: null,
  pending: "/assets/vectors/pending.svg",
  posted: "/assets/vectors/posted.svg",
};
const STATUS_OPTIONS: readonly StatusFilterValue[] = ["all", "pending", "posted"];

const AMOUNT_TYPE_LABELS: Record<AmountFilterType, string> = {
  all: "All",
  expense: "Expense",
  income: "Income",
};
const AMOUNT_TYPE_OPTIONS: readonly AmountFilterType[] = ["all", "income", "expense"];

const formatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

const HIDE_RIGHT_INDICATOR =
  "group/row pr-3 [&>[data-slot=dropdown-menu-checkbox-item-indicator]]:hidden [&>[data-slot=dropdown-menu-radio-item-indicator]]:hidden";

function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
        checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
      )}
    >
      {checked ? <HugeiconsIcon className="size-3" icon={Tick02Icon} strokeWidth={2.5} /> : null}
    </span>
  );
}

function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border",
        checked ? "border-primary" : "border-input",
      )}
    >
      {checked ? <span className="size-2 rounded-full bg-primary" /> : null}
    </span>
  );
}

function formatBound(value: number): string {
  return value >= SLIDER_MAX ? `${formatter.format(SLIDER_MAX)}+` : formatter.format(value);
}

interface AddFilterMenuProps {
  available: readonly FilterKey[];
  amount: AmountFilterValue;
  status: StatusFilterValue;
  bankIds: readonly string[];
  tagIds: readonly string[];
  categoryIds: readonly string[];
  dateFrom?: string;
  dateTo?: string;
  bankOptions: readonly BankOption[];
  tagOptions?: readonly TagOption[];
  categoryOptions?: readonly CategoryFilterOption[];
  items?: readonly TransactionListItem[];
  onChangeAmount: (next: AmountFilterValue) => void;
  onChangeStatus: (next: StatusFilterValue) => void;
  onChangeBanks: (next: readonly string[]) => void;
  onChangeTags: (next: readonly string[]) => void;
  onChangeCategories: (next: readonly string[]) => void;
  onChangeDates: (from: string | undefined, to: string | undefined) => void;
}

function CountBadge({ count }: { count: number }) {
  return <span className="ml-auto pl-2 text-muted-foreground text-xs tabular-nums">{count}</span>;
}

export function AddFilterMenu({
  available,
  amount,
  status,
  bankIds,
  tagIds,
  categoryIds,
  dateFrom,
  dateTo,
  bankOptions,
  tagOptions,
  categoryOptions,
  items,
  onChangeAmount,
  onChangeStatus,
  onChangeBanks,
  onChangeTags,
  onChangeCategories,
  onChangeDates,
}: AddFilterMenuProps) {
  const has = (k: FilterKey) => available.includes(k);
  const bankSet = new Set(bankIds);
  const tagSet = new Set(tagIds);
  const categorySet = new Set(categoryIds);

  const counts = (() => {
    const all = items?.length ?? 0;
    let pending = 0;
    const byBank = new Map<string, number>();
    const byTag = new Map<string, number>();
    const byCategory = new Map<string, number>();
    if (items) {
      for (const it of items) {
        if (it.pending) {
          pending += 1;
        }
        if (it.institutionName) {
          byBank.set(it.institutionName, (byBank.get(it.institutionName) ?? 0) + 1);
        }
        for (const tid of it.tagIds ?? []) {
          byTag.set(tid, (byTag.get(tid) ?? 0) + 1);
        }
        if (it.category?.id) {
          byCategory.set(it.category.id, (byCategory.get(it.category.id) ?? 0) + 1);
        }
      }
    }
    return { all, byBank, byCategory, byTag, pending, posted: all - pending };
  })();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const outerQ = query.trim().toLowerCase();
  const matches = (label: string) => !outerQ || label.toLowerCase().includes(outerQ);

  return (
    <DropdownMenu
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          requestAnimationFrame(() => inputRef.current?.focus());
        } else {
          setQuery("");
        }
      }}
      open={open}
    >
      <DropdownMenuTrigger
        render={
          <Button size="sm" type="button" variant="outline">
            <HugeiconsIcon className="size-3.5" icon={FilterIcon} />
            Filter
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-48 p-0">
        <div className="border-b px-3 py-2">
          <input
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground/80 outline-none"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
            placeholder="Add Filter..."
            ref={inputRef}
            value={query}
          />
        </div>
        <div className="p-1">
          {has("amount") && matches("Amount") ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-lg">
                <HugeiconsIcon className="size-4 text-muted-foreground" icon={DollarCircleIcon} />
                Amount
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-72 p-3" side="right" sideOffset={8}>
                <AmountSubContent onChange={onChangeAmount} value={amount} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
          {has("status") && matches("Status") ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-lg">
                <HugeiconsIcon className="size-4 text-muted-foreground" icon={Activity03Icon} />
                Status
              </DropdownMenuSubTrigger>
              <SearchableSubContent
                empty="No status."
                placeholder="Search status..."
                width="w-auto"
              >
                {(subQ) => (
                  <DropdownMenuRadioGroup
                    onValueChange={(v) => onChangeStatus(v as StatusFilterValue)}
                    value={status}
                  >
                    {STATUS_OPTIONS.filter(
                      (option) => !subQ || STATUS_LABELS[option].toLowerCase().includes(subQ),
                    ).map((option) => {
                      const iconSrc = STATUS_ICON_SRC[option];
                      const statusCountMap: Record<StatusFilterValue, number> = {
                        all: counts.all,
                        pending: counts.pending,
                        posted: counts.posted,
                      };
                      return (
                        <DropdownMenuRadioItem
                          className={HIDE_RIGHT_INDICATOR}
                          closeOnClick={false}
                          key={option}
                          value={option}
                        >
                          <RadioDot checked={option === status} />
                          {iconSrc ? (
                            <img
                              alt=""
                              className="size-4 shrink-0 object-contain"
                              decoding="async"
                              height={16}
                              src={iconSrc}
                              width={16}
                            />
                          ) : (
                            <span className="size-4 shrink-0" />
                          )}
                          {STATUS_LABELS[option]}
                          <CountBadge count={statusCountMap[option]} />
                        </DropdownMenuRadioItem>
                      );
                    })}
                  </DropdownMenuRadioGroup>
                )}
              </SearchableSubContent>
            </DropdownMenuSub>
          ) : null}
          {has("bank") && matches("Bank") ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-lg">
                <HugeiconsIcon className="size-4 text-muted-foreground" icon={BankIcon} />
                Bank
              </DropdownMenuSubTrigger>
              <SearchableSubContent empty="No banks connected." placeholder="Search banks...">
                {(subQ) =>
                  bankOptions
                    .filter((o) => !subQ || o.name.toLowerCase().includes(subQ))
                    .map((opt) => {
                      const checked = bankSet.has(opt.id);
                      return (
                        <DropdownMenuCheckboxItem
                          checked={checked}
                          className={HIDE_RIGHT_INDICATOR}
                          closeOnClick={false}
                          key={opt.id}
                          onCheckedChange={(next) => {
                            if (next) {
                              onChangeBanks([...bankIds, opt.id]);
                            } else {
                              onChangeBanks(bankIds.filter((id) => id !== opt.id));
                            }
                          }}
                        >
                          <CheckSquare checked={checked} />
                          <InstitutionLogo
                            institutionLogo={opt.logo}
                            institutionName={opt.name}
                            institutionUrl={opt.url}
                          />
                          <span className="min-w-0 truncate">{opt.name}</span>
                          <CountBadge count={counts.byBank.get(opt.name) ?? 0} />
                        </DropdownMenuCheckboxItem>
                      );
                    })
                }
              </SearchableSubContent>
            </DropdownMenuSub>
          ) : null}
          {has("tag") && tagOptions && matches("Tag") ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-lg">
                <HugeiconsIcon className="size-4 text-muted-foreground" icon={Tag01Icon} />
                Tag
              </DropdownMenuSubTrigger>
              <SearchableSubContent empty="No tags." placeholder="Search tags..." width="w-auto">
                {(subQ) =>
                  tagOptions
                    .filter((o) => !subQ || o.name.toLowerCase().includes(subQ))
                    .map((opt) => {
                      const checked = tagSet.has(opt.id);
                      return (
                        <DropdownMenuCheckboxItem
                          checked={checked}
                          className={HIDE_RIGHT_INDICATOR}
                          closeOnClick={false}
                          key={opt.id}
                          onCheckedChange={(next) => {
                            if (next) {
                              onChangeTags([...tagIds, opt.id]);
                            } else {
                              onChangeTags(tagIds.filter((id) => id !== opt.id));
                            }
                          }}
                        >
                          <CheckSquare checked={checked} />
                          <TagChip color={opt.color} name={opt.name} size="sm" />
                          <CountBadge
                            count={opt.transactionCount ?? counts.byTag.get(opt.id) ?? 0}
                          />
                        </DropdownMenuCheckboxItem>
                      );
                    })
                }
              </SearchableSubContent>
            </DropdownMenuSub>
          ) : null}
          {has("category") && categoryOptions && matches("Category") ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-lg">
                <HugeiconsIcon className="size-4 text-muted-foreground" icon={Folder01Icon} />
                Category
              </DropdownMenuSubTrigger>
              <SearchableSubContent empty="No categories." placeholder="Search categories...">
                {(subQ) => {
                  const filtered = categoryOptions.filter(
                    (o) =>
                      !subQ ||
                      o.name.toLowerCase().includes(subQ) ||
                      (o.groupName ?? "").toLowerCase().includes(subQ),
                  );
                  const groups = new Map<string, { groupName: string; items: typeof filtered }>();
                  for (const opt of filtered) {
                    const key = `${opt.groupSystemKey ?? "_custom"}::${opt.groupName ?? "Other"}`;
                    const bucket = groups.get(key);
                    if (bucket) {
                      bucket.items.push(opt);
                    } else {
                      groups.set(key, { groupName: opt.groupName ?? "Other", items: [opt] });
                    }
                  }
                  return [...groups.values()].map((g) => (
                    <div key={g.groupName}>
                      <div className="px-2.5 pt-2 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        {g.groupName}
                      </div>
                      {g.items.map((opt) => {
                        const checked = categorySet.has(opt.id);
                        const icon =
                          resolveCategoryIcon(opt.iconKey ?? null) ?? UNKNOWN_CATEGORY_ICON;
                        return (
                          <DropdownMenuCheckboxItem
                            checked={checked}
                            className={HIDE_RIGHT_INDICATOR}
                            closeOnClick={false}
                            key={opt.id}
                            onCheckedChange={(next) => {
                              if (next) {
                                onChangeCategories([...categoryIds, opt.id]);
                              } else {
                                onChangeCategories(categoryIds.filter((id) => id !== opt.id));
                              }
                            }}
                          >
                            <CheckSquare checked={checked} />
                            <span className="flex size-5 shrink-0 items-center justify-center">
                              <CategoryIcon icon={icon} sizeClassName="size-5" />
                            </span>
                            <span className="min-w-0 truncate">{opt.name}</span>
                            <CountBadge count={counts.byCategory.get(opt.id) ?? 0} />
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </div>
                  ));
                }}
              </SearchableSubContent>
            </DropdownMenuSub>
          ) : null}
          {has("dates") && matches("Dates") ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-lg">
                <HugeiconsIcon className="size-4 text-muted-foreground" icon={Calendar03Icon} />
                Dates
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-auto p-0" side="right" sideOffset={8}>
                <DatesSubContent from={dateFrom} onChange={onChangeDates} to={dateTo} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
          {available.length === 0 ? (
            <div className="px-3 py-2 text-muted-foreground text-xs">All filters applied</div>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SearchableSubContent({
  placeholder,
  empty,
  children,
  width = "w-64",
}: {
  placeholder: string;
  empty: string;
  children: (q: string) => React.ReactNode;
  width?: string;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const rendered = children(q);
  const isEmpty =
    Array.isArray(rendered) &&
    rendered.filter((n) => n !== null && n !== undefined && n !== false).length === 0;
  return (
    <DropdownMenuSubContent className={cn(width, "p-0")} side="right" sideOffset={8}>
      <div className="border-b px-3 py-2">
        <input
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground/80 outline-none"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder={placeholder}
          ref={inputRef}
          value={query}
        />
      </div>
      <div className="scrollbar-thin max-h-72 overflow-y-auto p-1">
        {isEmpty ? (
          <div className="px-3 py-4 text-center text-muted-foreground text-sm">{empty}</div>
        ) : (
          rendered
        )}
      </div>
    </DropdownMenuSubContent>
  );
}

function AmountSubContent({
  value,
  onChange,
}: {
  value: AmountFilterValue;
  onChange: (next: AmountFilterValue) => void;
}) {
  const { type, min, max } = value;
  const sliderMin = typeof min === "number" ? min : 0;
  const sliderMax = typeof max === "number" ? max : SLIDER_MAX;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        {AMOUNT_TYPE_OPTIONS.map((t) => (
          <Toggle
            className="flex-1"
            key={t}
            onPressedChange={(pressed) => {
              if (pressed) {
                onChange({ max, min, type: t });
              }
            }}
            pressed={type === t}
            size="sm"
            type="button"
            variant="outline"
          >
            {AMOUNT_TYPE_LABELS[t]}
          </Toggle>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>{formatBound(sliderMin)}</span>
          <span>{formatBound(sliderMax)}</span>
        </div>
        <Slider
          max={SLIDER_MAX}
          min={0}
          onValueChange={(values) => {
            if (!Array.isArray(values) || values.length < 2) {
              return;
            }
            const [nextMin, nextMax] = values as [number, number];
            onChange({
              max: nextMax < SLIDER_MAX ? nextMax : undefined,
              min: nextMin > 0 ? nextMin : undefined,
              type,
            });
          }}
          step={SLIDER_STEP}
          value={[sliderMin, sliderMax]}
        />
      </div>
    </div>
  );
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) {
    return;
  }
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) {
    return;
  }
  return new Date(y, m - 1, d);
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function DatesSubContent({
  from,
  to,
  onChange,
}: {
  from: string | undefined;
  to: string | undefined;
  onChange: (from: string | undefined, to: string | undefined) => void;
}) {
  const selected = { from: parseDate(from), to: parseDate(to) };
  const defaultMonth = new Date();
  defaultMonth.setDate(1);
  defaultMonth.setMonth(defaultMonth.getMonth() - 1);

  const today = new Date();
  const startOfWeek = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return d;
  })();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const presets: { label: string; from: Date; to: Date }[] = [
    {
      from: (() => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() - 7);
        return d;
      })(),
      label: "Last week",
      to: (() => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() - 1);
        return d;
      })(),
    },
    {
      from: (() => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() - 14);
        return d;
      })(),
      label: "Last 2 weeks",
      to: (() => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() - 1);
        return d;
      })(),
    },
    {
      from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      label: "Last month",
      to: new Date(today.getFullYear(), today.getMonth(), 0),
    },
    {
      from: new Date(today.getFullYear(), today.getMonth() - 3, 1),
      label: "Last 3 months",
      to: new Date(today.getFullYear(), today.getMonth(), 0),
    },
    { from: startOfMonth, label: "This month", to: today },
    { from: startOfYear, label: "This year", to: today },
  ];

  return (
    <div onKeyDown={(e) => e.stopPropagation()} role="presentation">
      <div className="flex flex-wrap gap-1 border-b p-2">
        {presets.map((p) => (
          <button
            className="rounded-md border bg-input/30 px-2 py-1 text-xs hover:bg-input/60"
            key={p.label}
            onClick={() => onChange(fmtDate(p.from), fmtDate(p.to))}
            type="button"
          >
            {p.label}
          </button>
        ))}
      </div>
      <Calendar
        className="bg-transparent"
        defaultMonth={defaultMonth}
        mode="range"
        numberOfMonths={2}
        onSelect={(range) => {
          onChange(
            range?.from ? fmtDate(range.from) : undefined,
            range?.to ? fmtDate(range.to) : undefined,
          );
        }}
        selected={selected.from ? selected : undefined}
      />
    </div>
  );
}

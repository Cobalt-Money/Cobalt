import { LogoCDN } from "@cobalt-web/ui/cobalt/logos/logo-cdn";
import { CategoryIcon, resolveCategoryIcon } from "@cobalt-web/ui/cobalt/transactions/categories";
import { TagChip } from "@cobalt-web/ui/cobalt/transactions/tags/tag-chip";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AppleStocksIcon,
  ArrowReloadHorizontalIcon,
  Calendar02Icon,
  CreditCardIcon,
  Home04Icon,
  NewsIcon,
  Search02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const NOTE_TEXT = "Client lunch — expense it.";
const LOOP_DURATION = 7;

type IconSvg = Parameters<typeof HugeiconsIcon>[0]["icon"];

const BRANDFETCH_CLIENT_ID = process.env.VITE_BRANDFETCH_CLIENT_ID || "";

const NAV: { icon: IconSvg; label: string; active?: boolean }[] = [
  { icon: Home04Icon, label: "Home" },
  { icon: CreditCardIcon, label: "Accounts" },
  { icon: AppleStocksIcon, label: "Brokerage" },
  { icon: Search02Icon, label: "Research" },
  { active: true, icon: ArrowReloadHorizontalIcon, label: "Transactions" },
  { icon: Calendar02Icon, label: "Subscriptions" },
  { icon: NewsIcon, label: "News" },
];

const TXNS: {
  merchant: string;
  domain: string;
  date: string;
  category: string;
  iconKey: string;
  amount: string;
  tags: { name: string; color: "green" | "blue" | "purple" | "orange" }[];
}[] = [
  {
    amount: "-$14.55",
    category: "Dining",
    date: "May 18",
    domain: "chipotle.com",
    iconKey: "restaurants",
    merchant: "Chipotle",
    tags: [{ color: "green", name: "Essentials" }],
  },
  {
    amount: "-$22.40",
    category: "Transport",
    date: "May 17",
    domain: "uber.com",
    iconKey: "taxi",
    merchant: "Uber",
    tags: [],
  },
  {
    amount: "-$11.99",
    category: "Entertainment",
    date: "May 16",
    domain: "spotify.com",
    iconKey: "streaming",
    merchant: "Spotify",
    tags: [{ color: "purple", name: "Subscriptions" }],
  },
  {
    amount: "-$48.10",
    category: "Gas",
    date: "May 15",
    domain: "shell.com",
    iconKey: "gas_fuel",
    merchant: "Shell",
    tags: [],
  },
  {
    amount: "-$6.85",
    category: "Coffee",
    date: "May 15",
    domain: "starbucks.com",
    iconKey: "coffee_shop",
    merchant: "Starbucks",
    tags: [],
  },
  {
    amount: "-$62.18",
    category: "Groceries",
    date: "May 14",
    domain: "traderjoes.com",
    iconKey: "groceries",
    merchant: "Trader Joe's",
    tags: [{ color: "green", name: "Essentials" }],
  },
  {
    amount: "-$28.42",
    category: "Food delivery",
    date: "May 13",
    domain: "doordash.com",
    iconKey: "food_delivery",
    merchant: "DoorDash",
    tags: [],
  },
  {
    amount: "-$18.50",
    category: "Movies",
    date: "May 12",
    domain: "amctheatres.com",
    iconKey: "movies",
    merchant: "AMC Theatres",
    tags: [],
  },
  {
    amount: "-$10.99",
    category: "Music",
    date: "May 11",
    domain: "apple.com",
    iconKey: "music",
    merchant: "Apple",
    tags: [{ color: "purple", name: "Subscriptions" }],
  },
];

interface Point {
  x: number;
  y: number;
}

export function TransactionsPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const addTagRef = useRef<HTMLSpanElement>(null);
  const tagOptionRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const [targets, setTargets] = useState<{
    row: Point;
    tags: Point;
    tagOption: Point;
    notes: Point;
  } | null>(null);

  const [typedText, setTypedText] = useState("");
  const [chipVisible, setChipVisible] = useState(false);

  useEffect(() => {
    const measure = () => {
      const c = containerRef.current?.getBoundingClientRect();
      if (!c) {
        return;
      }
      const point = (el: HTMLElement | null): Point | null => {
        if (!el) {
          return null;
        }
        const r = el.getBoundingClientRect();
        return {
          x: r.left - c.left + r.width / 4,
          y: r.top - c.top + r.height / 2,
        };
      };
      const row = point(rowRef.current);
      const tags = point(addTagRef.current);
      const tagOption = point(tagOptionRef.current);
      const notes = point(notesRef.current);
      if (row && tags && tagOption && notes) {
        setTargets({ notes, row, tagOption, tags });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    return () => ro.disconnect();
  }, [chipVisible]);
  const inHoldRef = useRef(false);
  // Extra hold (in fraction of loop) before clearing text on next iter wrap.
  const EXTRA_HOLD = 1 / LOOP_DURATION; // 1s
  useEffect(() => {
    let raf = 0;
    const startedAt = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const phase = (elapsed / 1000) % LOOP_DURATION;
      const p = phase / LOOP_DURATION;
      const blinkOn = Math.floor(elapsed / 500) % 2 === 0;
      const caret = blinkOn ? "|" : " ";
      setChipVisible(p >= 0.74);
      if (p >= 0.82 && p < 0.94) {
        const t = (p - 0.82) / (0.94 - 0.82);
        const len = Math.floor(t * NOTE_TEXT.length);
        setTypedText(NOTE_TEXT.slice(0, len) + caret);
        inHoldRef.current = false;
      } else if (p >= 0.94) {
        setTypedText(NOTE_TEXT + caret);
        inHoldRef.current = true;
      } else if (inHoldRef.current && p < EXTRA_HOLD) {
        setTypedText(NOTE_TEXT + caret);
      } else {
        setTypedText("");
        inHoldRef.current = false;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-background text-left shadow-lg"
      ref={containerRef}
    >
      <div className="flex items-center gap-1.5 border-border border-b bg-muted/40 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
      </div>
      <div className="flex">
        <aside className="flex w-32 shrink-0 flex-col gap-0.5 border-border border-r bg-muted/20 p-1.5">
          <div className="mb-1 flex items-center gap-1.5 px-1.5 py-1">
            <div className="size-5 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-violet-500" />
            <span className="truncate font-medium text-[11px]">You</span>
          </div>
          {NAV.map((n) => (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px]",
                n.active ? "bg-foreground/10 text-foreground" : "text-foreground/60",
              )}
              key={n.label}
            >
              <HugeiconsIcon
                aria-hidden
                className="size-3 shrink-0"
                icon={n.icon}
                strokeWidth={1.5}
              />
              <span className="truncate">{n.label}</span>
            </div>
          ))}
        </aside>

        <div className="relative flex h-[400px] flex-1">
          {/* List view */}
          <motion.div
            animate={{ opacity: [1, 1, 0, 0, 0] }}
            transition={{
              duration: LOOP_DURATION,
              ease: "easeInOut",
              repeat: Infinity,
              times: [0, 0.27, 0.33, 0.95, 1],
            }}
            className="absolute inset-0 flex flex-col gap-3 p-4"
          >
            <span className="font-semibold text-sm">Transactions</span>
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {["All", "Income", "Expenses", "Tags", "Notes"].map((f, i) => (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px]",
                      i === 0
                        ? "bg-foreground text-background"
                        : "border border-border text-muted-foreground",
                    )}
                    key={f}
                  >
                    {f}
                  </span>
                ))}
              </div>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                + Add
              </span>
            </div>
            <div>
              {TXNS.map((t, i) => (
                <motion.div
                  animate={
                    i === 1
                      ? {
                          backgroundColor: [
                            "rgba(120,120,120,0)",
                            "rgba(120,120,120,0)",
                            "rgba(120,120,120,0.18)",
                            "rgba(120,120,120,0)",
                          ],
                        }
                      : undefined
                  }
                  transition={{
                    duration: LOOP_DURATION,
                    ease: "easeInOut",
                    repeat: Infinity,
                    times: [0, 0.18, 0.25, 0.33],
                  }}
                  className="-mx-2 grid items-center gap-2 rounded-md px-2 py-3 text-xs"
                  key={t.merchant}
                  ref={i === 1 ? rowRef : undefined}
                  style={{ gridTemplateColumns: "16px 16px 56px 1fr 80px 1fr 70px" }}
                >
                  <span className="size-3 rounded-sm border border-foreground/30" />
                  <img
                    alt={i === 1 ? "Pending" : "Posted"}
                    className="size-3.5 shrink-0 object-contain"
                    src={i === 1 ? "/assets/vectors/pending.svg" : "/assets/vectors/posted.svg"}
                  />
                  <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                    {t.date}
                  </span>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <LogoCDN
                      className="size-4 shrink-0 overflow-hidden rounded-md bg-muted"
                      clientId={BRANDFETCH_CLIENT_ID}
                      domain={t.domain}
                      fallbackText={t.merchant[0] ?? ""}
                      logoApiSize={32}
                    />
                    <span className="truncate font-medium text-[11px]">{t.merchant}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
                    {(() => {
                      const icon = resolveCategoryIcon(t.iconKey);
                      return icon ? <CategoryIcon icon={icon} sizeClassName="size-3.5" /> : null;
                    })()}
                    <span className="truncate">{t.category}</span>
                  </div>
                  <div className="flex min-w-0 origin-left scale-90 items-center gap-1">
                    {t.tags.map((tag) => (
                      <TagChip
                        className="!h-4 !gap-1 !px-1.5 !text-[10px]"
                        color={tag.color}
                        key={tag.name}
                        name={tag.name}
                        size="sm"
                      />
                    ))}
                  </div>
                  <span
                    className={cn(
                      "text-right font-medium tabular-nums",
                      t.amount.startsWith("-") ? "text-foreground" : "text-emerald-600",
                    )}
                  >
                    {t.amount}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Detail view */}
          <motion.div
            animate={{ opacity: [0, 0, 0, 1, 1] }}
            transition={{
              duration: LOOP_DURATION,
              ease: "easeInOut",
              repeat: Infinity,
              times: [0, 0.33, 0.4, 0.45, 1],
            }}
            className="absolute inset-0 flex flex-col gap-4 px-6 py-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-balance font-medium text-foreground text-xl leading-tight tracking-tight">
                  Uber
                </h1>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  UBER *TRIP HELP.UBER.COM
                </p>
              </div>
              <LogoCDN
                className="size-9 shrink-0 overflow-hidden rounded-lg bg-muted"
                clientId={BRANDFETCH_CLIENT_ID}
                domain="uber.com"
                fallbackText="U"
                logoApiSize={96}
              />
            </div>
            <p className="font-semibold text-destructive text-lg tabular-nums tracking-tight">
              $22.40
            </p>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2">
                <img
                  alt="Pending"
                  className="size-4 shrink-0 object-contain"
                  src="/assets/vectors/pending.svg"
                />
                <span className="text-muted-foreground">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <LogoCDN
                  className="size-4 shrink-0 overflow-hidden rounded-md bg-muted"
                  clientId={BRANDFETCH_CLIENT_ID}
                  domain="chase.com"
                  fallbackText="C"
                  logoApiSize={32}
                />
                <span className="text-foreground">Sapphire Checking</span>
                <span className="text-muted-foreground">checking</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-4 shrink-0 text-muted-foreground">📅</span>
                <span className="text-foreground">May 17, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const icon = resolveCategoryIcon("taxi");
                  return icon ? <CategoryIcon icon={icon} sizeClassName="size-4" /> : null;
                })()}
                <span className="text-foreground">Transport</span>
                <span className="text-muted-foreground">›</span>
                <span className="text-muted-foreground">Rideshare</span>
              </div>
              <div className="relative flex flex-wrap items-center" ref={tagsRef}>
                {chipVisible ? (
                  <motion.div
                    animate={{ opacity: 1, scale: 1 }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="mr-1.5"
                  >
                    <TagChip color="blue" name="Work travel" size="sm" />
                  </motion.div>
                ) : null}
                <span
                  className="rounded-full border border-dashed border-foreground/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  ref={addTagRef}
                >
                  + Add
                </span>
                <motion.div
                  animate={{ opacity: [0, 0, 0, 1, 1, 0, 0] }}
                  transition={{
                    duration: LOOP_DURATION,
                    ease: "easeInOut",
                    repeat: Infinity,
                    times: [0, 0.52, 0.55, 0.58, 0.72, 0.74, 1],
                  }}
                  className="absolute top-full left-0 z-30 mt-1 flex flex-col gap-0.5 rounded-lg border border-border bg-background p-1 shadow-xl"
                >
                  {[
                    { color: "blue" as const, name: "Work travel" },
                    { color: "orange" as const, name: "Commute" },
                  ].map((opt, idx) => (
                    <div
                      className="flex items-center rounded-md px-1.5 py-1"
                      key={opt.name}
                      ref={idx === 0 ? tagOptionRef : undefined}
                    >
                      <TagChip color={opt.color} name={opt.name} size="sm" />
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-1.5 border-border border-t pt-3" ref={notesRef}>
              <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                Notes
              </span>
              <motion.span className="text-foreground text-xs">{typedText}</motion.span>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        animate={
          targets
            ? {
                opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
                scale: [1, 1, 1, 0.85, 1, 1, 0.85, 1, 0.85, 1, 0.85, 1],
                x: [
                  40,
                  40,
                  targets.row.x,
                  targets.row.x,
                  targets.row.x,
                  targets.tags.x,
                  targets.tags.x,
                  targets.tagOption.x,
                  targets.tagOption.x,
                  targets.notes.x,
                  targets.notes.x,
                  targets.notes.x,
                ],
                y: [
                  400,
                  400,
                  targets.row.y,
                  targets.row.y,
                  targets.row.y,
                  targets.tags.y,
                  targets.tags.y,
                  targets.tagOption.y,
                  targets.tagOption.y,
                  targets.notes.y,
                  targets.notes.y,
                  targets.notes.y,
                ],
              }
            : undefined
        }
        transition={{
          duration: LOOP_DURATION,
          ease: "easeInOut",
          repeat: Infinity,
          times: [0, 0.05, 0.18, 0.25, 0.4, 0.48, 0.53, 0.58, 0.7, 0.76, 0.82, 1],
        }}
        className="pointer-events-none absolute top-0 left-0 z-20"
      >
        <svg
          className="size-6 text-primary drop-shadow"
          viewBox="0 0 40 40"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="currentColor"
            d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
          />
        </svg>
      </motion.div>
    </div>
  );
}

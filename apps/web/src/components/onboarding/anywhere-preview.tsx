import { LogoCDN } from "@cobalt-web/ui/cobalt/logos/logo-cdn";
import { CategoryIcon, resolveCategoryIcon } from "@cobalt-web/ui/cobalt/transactions/categories";
import { cn } from "@cobalt-web/ui/lib/utils";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

const BRANDFETCH_CLIENT_ID = process.env.VITE_BRANDFETCH_CLIENT_ID || "";

const USER_PROMPT = "just had 100 pound dinner with henry at Le Cinq";
const ASSISTANT_REPLY = "Added. Logged Le Cinq dinner — £100 (~$127) — to Dining.";

const LOOP_DURATION = 12;
// Phase windows
const TYPE_START = 0.05;
const TYPE_END = 0.32;
const SEND_HOLD = 0.34;
const ASSIST_START = 0.4;
const ASSIST_END = 0.6;
const TXN_APPEAR = 0.62;
const ROW_CLICK = 0.76;
const DETAIL_OPEN = 0.8;

export function AnywherePreview() {
  const [inputText, setInputText] = useState("");
  const [sentText, setSentText] = useState("");
  const [assistText, setAssistText] = useState("");
  const [phaseFlags, setPhaseFlags] = useState({
    rowActive: false,
    showDetail: false,
    showTxn: false,
  });

  useEffect(() => {
    let raf = 0;
    const startedAt = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const p = ((elapsed / 1000) % LOOP_DURATION) / LOOP_DURATION;
      const blinkOn = Math.floor(elapsed / 500) % 2 === 0;
      const caret = blinkOn ? "|" : " ";

      // Left chat states
      if (p < TYPE_START) {
        setInputText("");
        setSentText("");
        setAssistText("");
      } else if (p < TYPE_END) {
        const t = (p - TYPE_START) / (TYPE_END - TYPE_START);
        const len = Math.floor(t * USER_PROMPT.length);
        setInputText(USER_PROMPT.slice(0, len) + caret);
        setSentText("");
        setAssistText("");
      } else if (p < SEND_HOLD) {
        setInputText(USER_PROMPT);
        setSentText("");
        setAssistText("");
      } else if (p < ASSIST_START) {
        setInputText("");
        setSentText(USER_PROMPT);
        setAssistText("");
      } else if (p < ASSIST_END) {
        setInputText("");
        setSentText(USER_PROMPT);
        const t = (p - ASSIST_START) / (ASSIST_END - ASSIST_START);
        const len = Math.floor(t * ASSISTANT_REPLY.length);
        setAssistText(ASSISTANT_REPLY.slice(0, len));
      } else {
        setInputText("");
        setSentText(USER_PROMPT);
        setAssistText(ASSISTANT_REPLY);
      }

      // Right cobalt states
      setPhaseFlags({
        rowActive: p >= ROW_CLICK,
        showDetail: p >= DETAIL_OPEN,
        showTxn: p >= TXN_APPEAR,
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="grid w-full max-w-3xl grid-cols-[200px_1fr] gap-3">
      <ClaudeMock assistText={assistText} inputText={inputText} sentText={sentText} />
      <CobaltMock {...phaseFlags} />
    </div>
  );
}

function ClaudeMock({
  assistText,
  inputText,
  sentText,
}: {
  assistText: string;
  inputText: string;
  sentText: string;
}) {
  return (
    <div className="flex items-center justify-center">
      {/* iPhone frame */}
      <div className="relative flex h-[360px] w-[180px] flex-col overflow-hidden rounded-[28px] border-[6px] border-zinc-900 bg-background shadow-2xl">
        {/* Dynamic Island */}
        <div className="absolute top-1 left-1/2 z-10 h-2.5 w-12 -translate-x-1/2 rounded-full bg-zinc-900" />
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[8px] text-foreground">
          <span className="font-medium">9:41</span>
          <span />
        </div>
        {/* iMessage contact header */}
        <div className="flex items-center justify-center gap-1 border-border/60 border-b px-3 pt-1 pb-1">
          <div className="flex size-4 items-center justify-center rounded-full bg-gradient-to-br from-zinc-300 to-zinc-500 font-semibold text-[7px] text-white">
            C
          </div>
          <span className="font-medium text-[8px]">Cobalt</span>
        </div>
        {/* Conversation */}
        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden p-2.5">
          <motion.div
            animate={sentText ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            initial={false}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex justify-end"
          >
            <div className="max-w-[88%] rounded-2xl bg-[#007AFF] px-2.5 py-1 text-[10px] text-white leading-tight">
              {sentText || USER_PROMPT}
            </div>
          </motion.div>
          <motion.div
            animate={assistText ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            initial={false}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex justify-start"
          >
            <div className="max-w-[88%] rounded-2xl bg-zinc-200 px-2.5 py-1 text-[10px] text-zinc-900 leading-tight dark:bg-zinc-700 dark:text-zinc-50">
              {assistText || ASSISTANT_REPLY}
            </div>
          </motion.div>
        </div>
        {/* iMessage input dock */}
        <div className="px-2 pt-1 pb-1.5">
          <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-muted/30 px-2 py-1">
            <span
              className={cn(
                "flex-1 whitespace-pre-wrap break-words text-left text-[9px] leading-snug",
                inputText ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {inputText || "iMessage"}
            </span>
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#007AFF] text-white">
              <svg
                className="size-2.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </span>
          </div>
        </div>
        {/* Home indicator */}
        <div className="flex justify-center pb-1.5">
          <span className="h-1 w-16 rounded-full bg-foreground/60" />
        </div>
      </div>
    </div>
  );
}

function CobaltMock({
  rowActive,
  showDetail,
  showTxn,
}: {
  rowActive: boolean;
  showDetail: boolean;
  showTxn: boolean;
}) {
  return (
    <div className="relative flex h-[360px] overflow-hidden rounded-xl border border-border bg-background text-left shadow-lg">
      <div className="flex w-full flex-col">
        <div className="flex items-center gap-1.5 border-border border-b bg-muted/40 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <span className="ml-2 truncate text-[10px] text-muted-foreground">cobalt</span>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex flex-1 flex-col gap-2 overflow-hidden p-3">
            <span className="font-semibold text-xs">Transactions</span>
            <div className="flex flex-col">
              <motion.div
                animate={
                  showTxn ? { height: "auto", opacity: 1, y: 0 } : { height: 0, opacity: 0, y: -16 }
                }
                initial={false}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <motion.div
                  animate={
                    rowActive
                      ? { backgroundColor: "rgba(120,120,120,0.18)" }
                      : { backgroundColor: "rgba(120,120,120,0)" }
                  }
                  transition={{ duration: 0.25 }}
                  className="rounded-md"
                >
                  <TxnRow
                    amount="-£100.00"
                    category="Dining"
                    date="Today"
                    domain="restaurant.com"
                    fallback="L"
                    iconKey="restaurants"
                    merchant="Le Cinq"
                    pending
                  />
                </motion.div>
              </motion.div>
              <TxnRow
                amount="-$14.55"
                category="Dining"
                date="May 18"
                domain="chipotle.com"
                iconKey="restaurants"
                merchant="Chipotle"
              />
              <TxnRow
                amount="-$22.40"
                category="Transport"
                date="May 17"
                domain="uber.com"
                iconKey="taxi"
                merchant="Uber"
              />
              <TxnRow
                amount="-$11.99"
                category="Entertainment"
                date="May 16"
                domain="spotify.com"
                iconKey="streaming"
                merchant="Spotify"
              />
              <TxnRow
                amount="-$48.10"
                category="Gas"
                date="May 15"
                domain="shell.com"
                iconKey="gas_fuel"
                merchant="Shell"
              />
              <TxnRow
                amount="-$6.85"
                category="Coffee"
                date="May 15"
                domain="starbucks.com"
                iconKey="coffee_shop"
                merchant="Starbucks"
              />
              <TxnRow
                amount="-$62.18"
                category="Groceries"
                date="May 14"
                domain="traderjoes.com"
                iconKey="groceries"
                merchant="Trader Joe's"
              />
              <TxnRow
                amount="-$28.42"
                category="Food delivery"
                date="May 13"
                domain="doordash.com"
                iconKey="food_delivery"
                merchant="DoorDash"
              />
              <TxnRow
                amount="-$10.99"
                category="Music"
                date="May 11"
                domain="apple.com"
                iconKey="music"
                merchant="Apple"
              />
            </div>

            <motion.div
              animate={showDetail ? { opacity: 1 } : { opacity: 0 }}
              initial={false}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 z-10 flex flex-col gap-3 bg-background px-4 py-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium text-foreground text-base leading-tight tracking-tight">
                    Le Cinq
                  </h2>
                  <p className="mt-0.5 truncate text-[9px] text-muted-foreground">Paris, France</p>
                </div>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted font-bold text-xs">
                  L
                </div>
              </div>
              <p className="font-semibold text-destructive text-base tabular-nums tracking-tight">
                £100.00
              </p>
              <div className="flex flex-col gap-2 text-[10px]">
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
                  <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                    📅
                  </span>
                  <span className="text-foreground">Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <RestaurantIcon />
                  <span className="text-foreground">Dining</span>
                  <span className="text-muted-foreground">›</span>
                  <span className="text-muted-foreground">Restaurants</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                    📍
                  </span>
                  <span className="text-foreground">31 Avenue George V, Paris</span>
                </div>
              </div>
              <MiniMap />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMap() {
  return (
    <div className="relative h-20 w-full overflow-hidden rounded-md border border-border bg-muted/40">
      <svg
        aria-hidden
        className="absolute inset-0 size-full text-muted-foreground/40"
        preserveAspectRatio="none"
        viewBox="0 0 200 80"
      >
        <defs>
          <pattern height="8" id="map-grid" patternUnits="userSpaceOnUse" width="8">
            <path
              d="M 8 0 L 0 0 0 8"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.4"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect fill="url(#map-grid)" height="100%" width="100%" />
        {/* River / main road */}
        <path
          d="M0 36 Q30 30 60 38 T120 34 T200 38"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.6"
          strokeWidth="2"
        />
        {/* Cross streets */}
        <line
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="1"
          x1="0"
          x2="200"
          y1="14"
          y2="14"
        />
        <line
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="1"
          x1="0"
          x2="200"
          y1="58"
          y2="58"
        />
        {/* Vertical streets */}
        <line
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="1"
          x1="32"
          x2="32"
          y1="0"
          y2="80"
        />
        <line
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="1"
          x1="72"
          x2="72"
          y1="0"
          y2="80"
        />
        <line
          stroke="currentColor"
          strokeOpacity="0.6"
          strokeWidth="1.2"
          x1="108"
          x2="108"
          y1="0"
          y2="80"
        />
        <line
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="1"
          x1="144"
          x2="144"
          y1="0"
          y2="80"
        />
        <line
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="1"
          x1="176"
          x2="176"
          y1="0"
          y2="80"
        />
        {/* Diagonal */}
        <line
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="1"
          x1="0"
          x2="200"
          y1="0"
          y2="80"
        />
        {/* Park block */}
        <rect fill="currentColor" fillOpacity="0.12" height="14" width="22" x="38" y="22" />
        <rect fill="currentColor" fillOpacity="0.12" height="12" width="18" x="150" y="44" />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <svg
          className="size-5 text-destructive drop-shadow"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
        </svg>
      </div>
    </div>
  );
}

function RestaurantIcon() {
  const icon = resolveCategoryIcon("restaurants");
  if (!icon) {
    return null;
  }
  return <CategoryIcon icon={icon} sizeClassName="size-3.5" />;
}

function TxnRow({
  amount,
  category,
  date,
  domain,
  fallback,
  iconKey,
  merchant,
  pending,
}: {
  amount: string;
  category: string;
  date: string;
  domain: string;
  fallback?: string;
  iconKey: string;
  merchant: string;
  pending?: boolean;
}) {
  return (
    <div className="grid items-center gap-2 py-2.5 text-[11px]">
      <div
        className="grid items-center gap-2"
        style={{ gridTemplateColumns: "14px 52px 1fr 80px 70px" }}
      >
        <img
          alt={pending ? "Pending" : "Posted"}
          className="size-3.5 shrink-0 object-contain"
          src={pending ? "/assets/vectors/pending.svg" : "/assets/vectors/posted.svg"}
        />
        <span className="whitespace-nowrap text-[10px] text-muted-foreground">{date}</span>
        <div className="flex min-w-0 items-center gap-2">
          <LogoCDN
            className="size-4 shrink-0 overflow-hidden rounded-md bg-muted"
            clientId={BRANDFETCH_CLIENT_ID}
            domain={domain}
            fallbackText={fallback ?? merchant[0] ?? ""}
            logoApiSize={32}
          />
          <span className="truncate font-medium">{merchant}</span>
        </div>
        <div className="flex min-w-0 items-center gap-1 text-muted-foreground">
          {(() => {
            const icon = resolveCategoryIcon(iconKey);
            return icon ? <CategoryIcon icon={icon} sizeClassName="size-3.5" /> : null;
          })()}
          <span className="truncate text-[10px]">{category}</span>
        </div>
        <span className="text-right font-medium tabular-nums">{amount}</span>
      </div>
    </div>
  );
}

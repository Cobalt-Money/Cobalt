import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AppleStocksIcon,
  ArrowReloadHorizontalIcon,
  Calendar02Icon,
  CreditCardIcon,
  Home04Icon,
  NewsIcon,
  PlusSignIcon,
  Search02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";

type IconSvg = Parameters<typeof HugeiconsIcon>[0]["icon"];

const NAV: { icon: IconSvg; label: string }[] = [
  { icon: Home04Icon, label: "Home" },
  { icon: CreditCardIcon, label: "Accounts" },
  { icon: AppleStocksIcon, label: "Brokerage" },
  { icon: Search02Icon, label: "Research" },
  { icon: ArrowReloadHorizontalIcon, label: "Transactions" },
  { icon: Calendar02Icon, label: "Subscriptions" },
  { icon: NewsIcon, label: "News" },
];

const USER_TEXT = "Am I on track to purchase a condo in the Lower East Side?";
const ASSISTANT_TEXT =
  "Based on your savings rate of $4,200/mo and your down payment fund of $87,500, you're tracking to hit a 20% down payment on a $1.4M LES condo by Q3 2027.";

const LOOP_DURATION = 10;

const DOWN_PAYMENT_GOAL = 280;
const CHART_DATA = [
  { q: "Now", value: 87 },
  { q: "Q4 '26", value: 100 },
  { q: "Q1 '27", value: 113 },
  { q: "Q2 '27", value: 125 },
  { q: "Q3 '27", value: 138 },
  { q: "Q4 '27", value: 150 },
  { q: "Q1 '28", value: 163 },
  { q: "Q2 '28", value: 175 },
  { q: "Q3 '28", value: 188 },
  { q: "Q4 '28", value: 200 },
  { q: "Q1 '29", value: 213 },
  { q: "Q2 '29", value: 225 },
  { q: "Q3 '29", value: 238 },
  { q: "Q4 '29", value: 250 },
  { q: "Q1 '30", value: 263 },
  { q: "Q2 '30", value: 280 },
];
// Phase windows (fractions of LOOP_DURATION)
const USER_TYPE_START = 0.05;
const USER_TYPE_END = 0.3;
const ASSIST_START = 0.4;
const ASSIST_END = 0.95;

export function ChatPreview() {
  const [inputText, setInputText] = useState("");
  const [sentText, setSentText] = useState("");
  const [assistText, setAssistText] = useState("");

  useEffect(() => {
    let raf = 0;
    const startedAt = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const phase = (elapsed / 1000) % LOOP_DURATION;
      const p = phase / LOOP_DURATION;
      const blinkOn = Math.floor(elapsed / 500) % 2 === 0;
      const caret = blinkOn ? "|" : " ";

      if (p < USER_TYPE_START) {
        setInputText("");
        setSentText("");
        setAssistText("");
      } else if (p < USER_TYPE_END) {
        const t = (p - USER_TYPE_START) / (USER_TYPE_END - USER_TYPE_START);
        const len = Math.floor(t * USER_TEXT.length);
        setInputText(USER_TEXT.slice(0, len) + caret);
        setSentText("");
        setAssistText("");
      } else if (p < USER_TYPE_END + 0.01) {
        // 100ms pause: input shows finished text, not yet sent
        setInputText(USER_TEXT);
        setSentText("");
        setAssistText("");
      } else if (p < ASSIST_START) {
        // Sent: input clears, bubble appears
        setInputText("");
        setSentText(USER_TEXT);
        setAssistText("");
      } else if (p < ASSIST_END) {
        setInputText("");
        setSentText(USER_TEXT);
        const t = (p - ASSIST_START) / (ASSIST_END - ASSIST_START);
        const len = Math.floor(t * ASSISTANT_TEXT.length);
        setAssistText(ASSISTANT_TEXT.slice(0, len));
      } else {
        setInputText("");
        setSentText(USER_TEXT);
        setAssistText(ASSISTANT_TEXT);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-background text-left shadow-lg">
      <div className="flex items-center gap-1.5 border-border border-b bg-muted/40 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
      </div>
      <div className="flex h-[400px]">
        <aside className="flex w-32 shrink-0 flex-col gap-0.5 border-border border-r bg-muted/20 p-1.5">
          <div className="mb-1 flex items-center gap-1.5 px-1.5 py-1">
            <div className="size-5 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-violet-500" />
            <span className="truncate font-medium text-[11px]">You</span>
          </div>
          <div className="mb-1 flex items-center gap-1.5 rounded-md bg-input/60 px-1.5 py-1 text-[11px] text-foreground">
            <HugeiconsIcon
              aria-hidden
              className="size-3 shrink-0"
              icon={PlusSignIcon}
              strokeWidth={2}
            />
            <span className="truncate">New chat</span>
          </div>
          {NAV.map((n) => (
            <div
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-foreground/60"
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
          <div className="mt-2 px-1.5 pb-0.5 pt-1 font-medium text-[9px] text-muted-foreground uppercase tracking-wide">
            Today
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-input/40 px-1.5 py-1 text-[10px] text-foreground">
            <span className="truncate">LES condo plan</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] text-foreground/60">
            <span className="truncate">Subscription audit</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] text-foreground/60">
            <span className="truncate">Tax harvest ideas</span>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 justify-center overflow-hidden p-4">
            <div className="flex w-full max-w-sm flex-col gap-3">
              {/* User bubble (appears once message is sent) */}
              <motion.div
                animate={sentText ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                initial={false}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex justify-end"
              >
                <div className="max-w-[80%] rounded-2xl bg-muted px-3 py-2 text-xs">
                  {sentText || USER_TEXT}
                </div>
              </motion.div>

              {/* Assistant response */}
              <motion.div
                animate={assistText ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                initial={false}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-start"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="text-foreground text-xs leading-relaxed">
                    {assistText || ASSISTANT_TEXT}
                  </p>
                  <motion.div
                    animate={
                      assistText === ASSISTANT_TEXT ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
                    }
                    initial={false}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="mt-1 flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                        Down payment trajectory
                      </span>
                      <span className="font-semibold text-[10px] text-emerald-600">On track</span>
                    </div>
                    <div className="h-24">
                      <ResponsiveContainer height="100%" width="100%">
                        <AreaChart
                          data={CHART_DATA}
                          margin={{ bottom: 0, left: 0, right: 4, top: 5 }}
                        >
                          <defs>
                            <linearGradient id="dpFill" x1="0" x2="0" y1="0" y2="1">
                              <stop
                                offset="0%"
                                stopColor="hsl(var(--foreground))"
                                stopOpacity={0.25}
                              />
                              <stop
                                offset="100%"
                                stopColor="hsl(var(--foreground))"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <XAxis
                            axisLine={false}
                            dataKey="q"
                            fontSize={8}
                            interval={3}
                            tick={{ fill: "currentColor", opacity: 0.5 }}
                            tickLine={false}
                          />
                          <YAxis hide domain={[60, 320]} />
                          <ReferenceLine
                            stroke="currentColor"
                            strokeDasharray="3 3"
                            strokeOpacity={0.4}
                            y={DOWN_PAYMENT_GOAL}
                            label={{
                              fill: "currentColor",
                              fontSize: 9,
                              opacity: 0.6,
                              position: "insideTopRight",
                              value: "$280k goal",
                            }}
                          />
                          <Area
                            dataKey="value"
                            fill="url(#dpFill)"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            type="monotone"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Input dock */}
          <div className="flex justify-center p-3">
            <div className="flex w-full max-w-sm items-center gap-1 rounded-full bg-popover py-1 pr-1 pl-1.5">
              <button
                aria-label="Attach"
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                type="button"
              >
                <HugeiconsIcon
                  aria-hidden
                  className="size-3.5"
                  icon={PlusSignIcon}
                  strokeWidth={2}
                />
              </button>
              <span
                className={cn(
                  "flex-1 truncate px-1 text-[11px]",
                  inputText ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {inputText || "Ask Cobalt"}
              </span>
              <button
                aria-label="Send"
                className="mr-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
                type="button"
              >
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
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

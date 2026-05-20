import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

interface TerminalEntry {
  id: number;
  prompt: string;
}

export function McpVisual() {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fullResponse = "I'd love to answer that. First, connect your accounts.";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      behavior: "smooth",
      top: scrollRef.current.scrollHeight,
    });
  }, [entries.length, streamingText.length]);

  useEffect(() => {
    if (!isStreaming || streamingText.length >= fullResponse.length) {
      return;
    }
    const timer = setTimeout(() => {
      setStreamingText(fullResponse.slice(0, streamingText.length + 1));
    }, 15);
    return () => clearTimeout(timer);
  }, [isStreaming, streamingText]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    setEntries((prev) => [...prev, { id: Date.now(), prompt: trimmed }]);
    setDraft("");
    setStreamingText("");
    setIsStreaming(true);
  };

  return (
    <div
      className="mx-auto w-full max-w-[760px] overflow-hidden rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-2xl"
      onClick={(e) => {
        if (e.target === e.currentTarget || !(e.target as HTMLElement).closest("a, input")) {
          inputRef.current?.focus();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          inputRef.current?.focus();
        }
      }}
      role="application"
      style={{
        fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
      }}
    >
      <div className="relative flex items-center gap-1.5 border-b border-black/10 dark:border-white/10 bg-[#ebebeb] dark:bg-[#2d2d2d] px-3 py-2">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <span className="-translate-x-1/2 absolute left-1/2 text-[11px] text-[#1a1a1a]/45 dark:text-white/40">
          ~/projects/finances — claude
        </span>
      </div>

      <div
        className="max-h-[440px] overflow-y-auto p-4 text-[12px] text-[#1a1a1a] dark:text-[#e6e4dd] leading-[1.55] no-scrollbar"
        ref={scrollRef}
      >
        <div className="mb-3 rounded border border-[#d97757]/40 bg-[#d97757]/5 px-3 py-2">
          <div>
            <span className="text-[#d97757]">✻</span>
            <span className="ml-2 text-[#1a1a1a]/90 dark:text-white/90">
              Welcome to Claude Code!
            </span>
          </div>
          <div className="mt-1 pl-5 text-[11px] text-[#1a1a1a]/45 dark:text-white/40">
            /help for help, /status for your current setup
          </div>
          <div className="mt-1 pl-5 text-[11px] text-[#1a1a1a]/45 dark:text-white/40">
            cwd: /Users/rust/projects/finances
          </div>
        </div>

        <div className="text-[#1a1a1a]/90 dark:text-white/90">
          <span className="text-[#1a1a1a]/45 dark:text-white/40">&gt;</span>
          <span className="ml-2">what did I spend on restaurants last month?</span>
        </div>
        <div className="mt-3">
          <span className="text-[#d97757]">⏺</span>
          <span className="ml-2 text-[#1a1a1a]/75 dark:text-white/80">
            I'll check your restaurant spending via Cobalt.
          </span>
        </div>
        <div className="mt-3">
          <span className="text-[#7fb069]">⏺</span>
          <span className="ml-2 text-[#1a1a1a]/90 dark:text-white/90">cobalt - </span>
          <span className="text-[#d0c58a]">transactions_sum</span>
          <span className="text-[#1a1a1a]/50 dark:text-white/50">(category: </span>
          <span className="text-[#9ccc8d]">"restaurants"</span>
          <span className="text-[#1a1a1a]/50 dark:text-white/50">, period: </span>
          <span className="text-[#9ccc8d]">"last_month"</span>
          <span className="text-[#1a1a1a]/50 dark:text-white/50">)</span>
        </div>
        <div className="mt-0.5 pl-5 text-[#1a1a1a]/50 dark:text-white/50">
          <span>⎿</span>
          <span className="ml-2 text-[#1a1a1a]/55 dark:text-white/60">
            total: $847.23 · count: 23 · vs_prev: +18%
          </span>
        </div>
        <div className="mt-3">
          <span className="text-[#d97757]">⏺</span>
          <span className="ml-2 text-[#1a1a1a]/90 dark:text-white/90">
            You spent <span className="text-black dark:text-white">$847</span> on restaurants last
            month across 23 transactions — <span className="text-[#febc2e]">18% over</span>{" "}
            September. Three late-night Uber Eats orders did most of the damage.
          </span>
        </div>

        {entries.map((entry, idx) => (
          <div key={entry.id}>
            <div className="mt-4 text-[#1a1a1a]/90 dark:text-white/90">
              <span className="text-[#1a1a1a]/45 dark:text-white/40">&gt;</span>
              <span className="ml-2">{entry.prompt}</span>
            </div>
            {idx === entries.length - 1 && isStreaming ? (
              <>
                <div className="mt-3">
                  <span className="text-[#d97757]">⏺</span>
                  <span className="ml-2 text-[#1a1a1a]/75 dark:text-white/80">
                    {streamingText}
                    {streamingText.length < fullResponse.length && (
                      <span className="animate-pulse">_</span>
                    )}
                  </span>
                </div>
                {streamingText.length >= fullResponse.length && (
                  <>
                    <div className="mt-2">
                      <span className="text-[#febc2e]">⏺</span>
                      <span className="ml-2 text-[#1a1a1a]/65 dark:text-white/70">
                        cobalt mcp · not authenticated
                      </span>
                    </div>
                    <div className="mt-2 pl-5">
                      <Link
                        className="inline-flex items-center gap-1.5 rounded border border-[#d97757]/50 bg-[#d97757]/10 px-2.5 py-1 text-[#d97757] text-[11px] hover:bg-[#d97757]/20"
                        to="/login"
                      >
                        → Sign in to Cobalt
                      </Link>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="mt-3">
                  <span className="text-[#d97757]">⏺</span>
                  <span className="ml-2 text-[#1a1a1a]/75 dark:text-white/80">{fullResponse}</span>
                </div>
                <div className="mt-2">
                  <span className="text-[#febc2e]">⏺</span>
                  <span className="ml-2 text-[#1a1a1a]/65 dark:text-white/70">
                    cobalt mcp · not authenticated
                  </span>
                </div>
                <div className="mt-2 pl-5">
                  <Link
                    className="inline-flex items-center gap-1.5 rounded border border-[#d97757]/50 bg-[#d97757]/10 px-2.5 py-1 text-[#d97757] text-[11px] hover:bg-[#d97757]/20"
                    to="/login"
                  >
                    → Sign in to Cobalt
                  </Link>
                </div>
              </>
            )}
          </div>
        ))}

        <div className="mt-4 rounded border border-black/15 dark:border-white/15 px-3 py-2">
          <div className="flex items-center gap-2 text-[#1a1a1a]/65 dark:text-white/70">
            <span className="text-[#d97757]">&gt;</span>
            <input
              className="flex-1 border-none bg-transparent text-[#1a1a1a]/90 dark:text-white/90 placeholder-black/30 dark:placeholder-white/30 outline-none"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={
                entries.length === 0
                  ? 'Try "rebalance my portfolio"'
                  : "Ask anything about your money…"
              }
              ref={inputRef}
              type="text"
              value={draft}
            />
            {draft.length === 0 && (
              <span className="inline-block h-[13px] w-[6px] animate-pulse bg-black/60 dark:bg-white/60" />
            )}
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#1a1a1a]/35 dark:text-white/35">
          <span>? for shortcuts</span>
          <span>
            cobalt mcp ·{" "}
            {entries.length > 0 ? (
              <span className="text-[#febc2e]">sign in required</span>
            ) : (
              <span className="text-[#7fb069]">connected</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

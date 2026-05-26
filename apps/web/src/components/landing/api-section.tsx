import { ComputerTerminal01Icon, JavaScriptIcon, PythonIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import type { BundledLanguage, ThemedToken } from "shiki";

import { FadeUp } from "./fade-up";

type Lang = "curl" | "ts" | "python";

const SHIKI_LANG: Record<Lang | "json", BundledLanguage> = {
  curl: "bash",
  json: "json",
  python: "python",
  ts: "typescript",
};

function HighlightedCode({ code, language }: { code: string; language: BundledLanguage }) {
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);
  const { resolvedTheme } = useTheme();
  const shikiTheme = resolvedTheme === "light" ? "min-light" : "github-dark-default";

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const { codeToTokens } = await import("shiki");
        const result = await codeToTokens(code, { lang: language, theme: shikiTheme });
        if (!cancelled) {
          setTokens(result.tokens);
        }
      } catch {
        if (!cancelled) {
          setTokens(null);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [code, language, shikiTheme]);

  if (!tokens) {
    return <code>{code}</code>;
  }
  return (
    <code style={{ filter: "brightness(0.55) saturate(1.3)" }}>
      {tokens.map((line, lineIdx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable per render
        <span className="block" key={lineIdx}>
          {line.length === 0
            ? "\n"
            : line.map((token, tokenIdx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: stable per render
                <span key={tokenIdx} style={{ color: token.color }}>
                  {token.content}
                </span>
              ))}
        </span>
      ))}
    </code>
  );
}

// ---------------------------------------------------------------------------
// Mock response
// ---------------------------------------------------------------------------

interface ParamRow {
  key: string;
  defaultValue: string;
  enabled: boolean;
}

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

const METHOD_COLOR: Record<HttpMethod, string> = {
  DELETE: "bg-red-500/15 text-red-700 dark:text-red-400",
  GET: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  PATCH: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  POST: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  PUT: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

const METHOD_SIDEBAR_COLOR: Record<HttpMethod, string> = {
  DELETE: "text-red-600 dark:text-red-400",
  GET: "text-emerald-600 dark:text-emerald-400",
  PATCH: "text-purple-600 dark:text-purple-400",
  POST: "text-blue-600 dark:text-blue-400",
  PUT: "text-amber-600 dark:text-amber-400",
};

interface EndpointDef {
  id: string;
  method: HttpMethod;
  path: string;
  name: string;
  group: string;
  headers: ParamRow[];
  params: ParamRow[];
  response: unknown;
}

const DEFAULT_HEADERS: ParamRow[] = [
  { defaultValue: "application/json", enabled: true, key: "accept" },
];

const ENDPOINTS: EndpointDef[] = [
  {
    group: "Transactions",
    headers: DEFAULT_HEADERS,
    id: "transactions.list",
    method: "GET",
    name: "List transactions",
    params: [
      { defaultValue: "50", enabled: true, key: "limit" },
      { defaultValue: "", enabled: true, key: "startDate" },
      { defaultValue: "", enabled: true, key: "cursor" },
    ],
    path: "/v1/transactions",
    response: {
      hasMore: true,
      nextCursor: "eyJkIjoiMjAyNi0wNC0xMyIs",
      transactions: [
        {
          accountName: "EVERYDAY CHECKING ...1595",
          amount: 239,
          category: "student_loan",
          currency: "USD",
          date: "2026-05-20",
          id: "tx_0xab39f1",
          merchantName: "Dept Education Student Ln",
          pending: false,
        },
      ],
    },
  },
  {
    group: "Accounts",
    headers: DEFAULT_HEADERS,
    id: "accounts.list",
    method: "GET",
    name: "List accounts",
    params: [
      { defaultValue: "", enabled: true, key: "institutionId" },
      { defaultValue: "", enabled: true, key: "type" },
    ],
    path: "/v1/accounts",
    response: {
      accounts: [
        { balance: 4218.54, id: "acc_0x7a", name: "EVERYDAY CHECKING ...1595", type: "depository" },
        { balance: 38_240.11, id: "acc_0x7b", name: "Roth IRA", type: "investment" },
      ],
    },
  },
  {
    group: "Brokerage",
    headers: DEFAULT_HEADERS,
    id: "holdings.list",
    method: "GET",
    name: "List holdings",
    params: [
      { defaultValue: "", enabled: true, key: "accountId" },
      { defaultValue: "", enabled: true, key: "asOf" },
    ],
    path: "/v1/positions",
    response: {
      holdings: [
        { marketValue: 32_812.18, quantity: 142.13, symbol: "VTI", unrealizedPnl: 13_911.76 },
        { marketValue: 5427.93, quantity: 12, symbol: "NVDA", unrealizedPnl: 1227.93 },
      ],
    },
  },
  {
    group: "Transactions",
    headers: DEFAULT_HEADERS,
    id: "transactions.get",
    method: "GET",
    name: "Get transaction",
    params: [],
    path: "/v1/transactions/{transactionId}",
    response: {
      accountName: "EVERYDAY CHECKING ...1595",
      amount: 239,
      category: "student_loan",
      currency: "USD",
      date: "2026-05-20",
      id: "tx_0xab39f1",
      merchantName: "Dept Education Student Ln",
      pending: false,
      tags: ["loans", "monthly"],
    },
  },
  {
    group: "Transactions",
    headers: DEFAULT_HEADERS,
    id: "transactions.update",
    method: "PATCH",
    name: "Update transaction",
    params: [
      { defaultValue: "Federal Loans", enabled: true, key: "merchantName" },
      { defaultValue: "student_loan", enabled: true, key: "category" },
    ],
    path: "/v1/transactions/{transactionId}",
    response: { id: "tx_0xab39f1", updated: true },
  },
  {
    group: "Tags",
    headers: DEFAULT_HEADERS,
    id: "tags.create",
    method: "POST",
    name: "Create tag",
    params: [
      { defaultValue: "vacation-2026", enabled: true, key: "name" },
      { defaultValue: "#0ea5e9", enabled: true, key: "color" },
    ],
    path: "/v1/tags",
    response: { color: "#0ea5e9", id: "tag_0x9c2", name: "vacation-2026" },
  },
  {
    group: "Tags",
    headers: DEFAULT_HEADERS,
    id: "tags.update",
    method: "PUT",
    name: "Update tag",
    params: [{ defaultValue: "vacation-summer", enabled: true, key: "name" }],
    path: "/v1/tags/{tagId}",
    response: { id: "tag_0x9c2", name: "vacation-summer", updated: true },
  },
  {
    group: "Tags",
    headers: DEFAULT_HEADERS,
    id: "tags.delete",
    method: "DELETE",
    name: "Delete tag",
    params: [],
    path: "/v1/tags/{tagId}",
    response: { deleted: true, id: "tag_0x9c2" },
  },
  {
    group: "Tags",
    headers: DEFAULT_HEADERS,
    id: "tags.bulkApply",
    method: "POST",
    name: "Bulk apply tags",
    params: [
      { defaultValue: '["tx_0xab39f1","tx_0xc81"]', enabled: true, key: "transactionIds" },
      { defaultValue: '["tag_0x9c2"]', enabled: true, key: "tagIds" },
    ],
    path: "/v1/tags/bulk-apply",
    response: { applied: 2 },
  },
  {
    group: "Reference",
    headers: DEFAULT_HEADERS,
    id: "categories.list",
    method: "GET",
    name: "List categories",
    params: [{ defaultValue: "", enabled: true, key: "group" }],
    path: "/v1/categories",
    response: {
      categories: [
        { id: "cat_food", name: "Food & Drink" },
        { id: "cat_rent", name: "Rent" },
        { id: "cat_income", name: "Payroll" },
      ],
    },
  },
  {
    group: "Reference",
    headers: DEFAULT_HEADERS,
    id: "categories.create",
    method: "POST",
    name: "Create category",
    params: [
      { defaultValue: "Coffee", enabled: true, key: "name" },
      { defaultValue: "food", enabled: true, key: "group" },
    ],
    path: "/v1/categories",
    response: { group: "food", id: "cat_coffee", name: "Coffee" },
  },
  {
    group: "Reference",
    headers: DEFAULT_HEADERS,
    id: "categories.update",
    method: "PATCH",
    name: "Update category",
    params: [{ defaultValue: "Espresso", enabled: true, key: "name" }],
    path: "/v1/categories/{categoryId}",
    response: { id: "cat_coffee", name: "Espresso", updated: true },
  },
  {
    group: "Reference",
    headers: DEFAULT_HEADERS,
    id: "categories.delete",
    method: "DELETE",
    name: "Delete category",
    params: [],
    path: "/v1/categories/{categoryId}",
    response: { deleted: true, id: "cat_coffee" },
  },
];

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      className={`size-3.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      aria-label="Toggle"
      className={`flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border transition-colors ${
        checked
          ? "border-foreground/60 bg-foreground/10 text-foreground"
          : "border-foreground/15 text-transparent hover:border-foreground/30"
      }`}
    >
      <input
        checked={checked}
        className="sr-only"
        onChange={(e) => onChange(e.target.checked)}
        type="checkbox"
      />
      <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

function SectionHeader({
  label,
  open,
  onToggle,
  right,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  right?: React.ReactNode;
}) {
  return (
    <button
      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-foreground/70 hover:text-foreground"
      onClick={onToggle}
      type="button"
    >
      <ChevronDown open={open} />
      <span>{label}</span>
      {right ? <span className="ml-auto">{right}</span> : null}
    </button>
  );
}

function EndpointSidebar({
  activeId,
  groups,
  onSelect,
}: {
  activeId: string;
  groups: [string, EndpointDef[]][];
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="hidden w-48 shrink-0 border-foreground/5 border-r sm:block">
      <div className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
        Endpoints
      </div>
      {groups.map(([group, items]) => (
        <div className="mb-2" key={group}>
          <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground/40">
            {group}
          </div>
          {items.map((e) => (
            <button
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors ${
                e.id === activeId
                  ? "bg-foreground/5 text-foreground"
                  : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              }`}
              key={e.id}
              onClick={() => onSelect(e.id)}
              type="button"
            >
              <span
                className={`w-10 shrink-0 text-right font-mono text-[9px] font-semibold ${METHOD_SIDEBAR_COLOR[e.method]}`}
              >
                {e.method}
              </span>
              <span className="min-w-0 truncate">{e.name}</span>
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}

function ParamRowsTable({
  rows,
  setRows,
  readOnly = false,
  valuePlaceholder = "Value",
}: {
  rows: ParamRow[];
  setRows?: (next: ParamRow[]) => void;
  readOnly?: boolean;
  valuePlaceholder?: string;
}) {
  const update = (idx: number, patch: Partial<ParamRow>) => {
    setRows?.(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  void readOnly;
  const allRows = [...rows, { defaultValue: "", enabled: false, key: "" }];
  return (
    <div className="border-foreground/5 border-t">
      {allRows.map((row, i) => (
        <div
          className="grid grid-cols-[40px_1fr_1fr_28px] items-center border-foreground/5 border-b text-[12px]"
          // biome-ignore lint/suspicious/noArrayIndexKey: stable per render
          key={i}
        >
          <div className="flex items-center justify-center py-2">
            {i < rows.length ? (
              <Checkbox checked={row.enabled} onChange={(v) => update(i, { enabled: v })} />
            ) : (
              <div className="size-4 rounded-[3px] border border-foreground/10" />
            )}
          </div>
          <input
            className="border-foreground/5 border-l bg-transparent px-3 py-2 outline-none placeholder:text-foreground/30"
            onChange={(e) => {
              if (i < rows.length) {
                update(i, { key: e.target.value });
              }
            }}
            placeholder={i < rows.length ? "" : "Key"}
            value={row.key}
          />
          <input
            className="border-foreground/5 border-l bg-transparent px-3 py-2 outline-none placeholder:text-foreground/30"
            onChange={(e) => {
              if (i < rows.length) {
                update(i, { defaultValue: e.target.value });
              }
            }}
            placeholder={valuePlaceholder}
            value={row.defaultValue}
          />
          <div className="flex items-center justify-center border-foreground/5 border-l py-2 text-foreground/30">
            <svg
              aria-hidden
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ResponseState {
  status: number;
  latencyMs: number;
  body: string;
}

// oxlint-disable-next-line complexity
export function ApiSection() {
  const [endpointId, setEndpointId] = useState<string>(ENDPOINTS[0]?.id ?? "");
  const endpoint = useMemo(
    () => (ENDPOINTS.find((e) => e.id === endpointId) ?? ENDPOINTS[0]) as EndpointDef,
    [endpointId],
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [headersByEndpoint, setHeadersByEndpoint] = useState<Record<string, ParamRow[]>>(() =>
    Object.fromEntries(ENDPOINTS.map((e) => [e.id, e.headers])),
  );
  const [paramsByEndpoint, setParamsByEndpoint] = useState<Record<string, ParamRow[]>>(() =>
    Object.fromEntries(ENDPOINTS.map((e) => [e.id, e.params])),
  );
  const headers = headersByEndpoint[endpoint.id] ?? endpoint.headers;
  const query = paramsByEndpoint[endpoint.id] ?? endpoint.params;
  const setHeaders = (rows: ParamRow[]) =>
    setHeadersByEndpoint((s) => ({ ...s, [endpoint.id]: rows }));
  const setQuery = (rows: ParamRow[]) =>
    setParamsByEndpoint((s) => ({ ...s, [endpoint.id]: rows }));

  const [openLeft, setOpenLeft] = useState({
    cookies: true,
    headers: true,
    query: true,
  });
  const [openRight, setOpenRight] = useState({
    body: true,
    cookies: false,
    reqHeaders: false,
    resHeaders: false,
  });
  const [bodyView, setBodyView] = useState<"preview" | "raw">("preview");
  const [responsesByEndpoint, setResponsesByEndpoint] = useState<Record<string, ResponseState>>(
    () =>
      Object.fromEntries(
        ENDPOINTS.map((e) => [
          e.id,
          { body: JSON.stringify(e.response, null, 2), latencyMs: 202, status: 200 },
        ]),
      ),
  );
  const response = responsesByEndpoint[endpoint.id] ?? null;
  const [sending, setSending] = useState(false);

  const [view, setView] = useState<"api" | "sdk">("sdk");

  const send = () => {
    setSending(true);
    const latency = 80 + Math.floor(Math.random() * 200);
    window.setTimeout(() => {
      setResponsesByEndpoint((s) => ({
        ...s,
        [endpoint.id]: {
          body: JSON.stringify(endpoint.response, null, 2),
          latencyMs: latency,
          status: 200,
        },
      }));
      setSending(false);
    }, latency);
  };

  const groupedEndpoints = useMemo(() => {
    const map = new Map<string, EndpointDef[]>();
    for (const e of ENDPOINTS) {
      const list = map.get(e.group) ?? [];
      list.push(e);
      map.set(e.group, list);
    }
    return [...map.entries()];
  }, []);

  return (
    <section className="px-6 py-24 lg:py-32">
      <div className={`mx-auto ${view === "sdk" ? "max-w-3xl" : "max-w-6xl"}`}>
        <FadeUp className="mb-12 text-center [text-shadow:_0_2px_24px_rgba(0,0,0,0.55)]">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            API for your money
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            Build your own personal finance apps without having to manage glue code.
          </p>
        </FadeUp>

        <FadeUp className="mb-6 flex justify-center gap-2" delay={0.05}>
          {(["api", "sdk"] as const).map((v) => {
            const isActive = view === v;
            return (
              <button
                className={`w-24 rounded-md border px-5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-white bg-white text-black"
                    : "border-white/20 bg-transparent text-white/70 hover:text-white"
                }`}
                key={v}
                onClick={() => setView(v)}
                type="button"
              >
                {v === "api" ? "API" : "SDK"}
              </button>
            );
          })}
        </FadeUp>

        {view === "sdk" ? (
          <SdkPanel />
        ) : (
          <FadeUp
            className="overflow-hidden rounded-2xl border border-white/15 bg-background/70 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl backdrop-saturate-150"
            delay={0.1}
            y={24}
          >
            {/* Top bar */}
            <div className="flex items-center gap-2 border-foreground/10 border-b px-3 py-2.5">
              <button
                aria-label="Toggle sidebar"
                className={`rounded-md p-1.5 hover:bg-foreground/5 hover:text-foreground ${sidebarOpen ? "bg-foreground/5 text-foreground" : "text-foreground/60"}`}
                onClick={() => setSidebarOpen((v) => !v)}
                type="button"
              >
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                >
                  <rect height="16" rx="2" width="16" x="4" y="4" />
                  <path d="M10 4v16" />
                </svg>
              </button>
              <div className="ml-2 flex flex-1 items-center gap-2 rounded-md bg-foreground/5 px-3 py-1.5">
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider ${METHOD_COLOR[endpoint.method]}`}
                >
                  {endpoint.method}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
                  {endpoint.path}
                </span>
                <button
                  aria-label="Copy"
                  className="rounded p-1 text-foreground/50 hover:bg-foreground/5 hover:text-foreground"
                  type="button"
                >
                  <svg
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    viewBox="0 0 24 24"
                  >
                    <rect height="13" rx="2" width="13" x="9" y="8" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                  </svg>
                </button>
                <button
                  aria-label="History"
                  className="rounded p-1 text-foreground/50 hover:bg-foreground/5 hover:text-foreground"
                  type="button"
                >
                  <svg
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <button
                className="hidden items-center gap-1.5 rounded-md bg-foreground px-4 py-1.5 text-[13px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50 lg:inline-flex"
                disabled={sending}
                onClick={send}
                type="button"
              >
                <svg className="size-3" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M2 1.5v9l9-4.5z" />
                </svg>
                {sending ? "Sending…" : "Send"}
              </button>
              <a
                className="hidden items-center gap-1 rounded-md border px-3 py-1.5 text-[13px] font-medium text-foreground/80 hover:bg-foreground/5 lg:inline-flex"
                href="https://docs.cobaltpf.com"
                rel="noopener noreferrer"
                target="_blank"
              >
                <svg
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Open API Client
              </a>
            </div>

            {/* Body: sidebar + 2 columns */}
            <div className="flex">
              {sidebarOpen ? (
                <EndpointSidebar
                  activeId={endpoint.id}
                  groups={groupedEndpoints}
                  onSelect={setEndpointId}
                />
              ) : null}
              <div className="grid min-h-[520px] min-w-0 flex-1 lg:grid-cols-2">
                {/* Left: request */}
                <div className="hidden border-foreground/5 lg:block lg:border-r">
                  <div className="flex items-center justify-between border-foreground/5 border-b px-4 py-3 text-[13px]">
                    <span className="font-medium text-foreground">{endpoint.name}</span>
                    <button
                      className="flex items-center gap-1 text-foreground/50 hover:text-foreground"
                      type="button"
                    >
                      All
                      <svg
                        className="size-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  <SectionHeader
                    label="Cookies"
                    onToggle={() => setOpenLeft((s) => ({ ...s, cookies: !s.cookies }))}
                    open={openLeft.cookies}
                  />
                  {openLeft.cookies ? <ParamRowsTable readOnly rows={[]} /> : null}

                  <SectionHeader
                    label="Headers"
                    onToggle={() => setOpenLeft((s) => ({ ...s, headers: !s.headers }))}
                    open={openLeft.headers}
                  />
                  {openLeft.headers ? <ParamRowsTable rows={headers} setRows={setHeaders} /> : null}

                  <SectionHeader
                    label="Query Parameters"
                    onToggle={() => setOpenLeft((s) => ({ ...s, query: !s.query }))}
                    open={openLeft.query}
                  />
                  {openLeft.query ? <ParamRowsTable rows={query} setRows={setQuery} /> : null}
                </div>

                {/* Right: response */}
                <div>
                  <div className="flex items-center justify-between border-foreground/5 border-b px-4 py-3 text-[13px]">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground/60">{response?.latencyMs ?? 0}ms</span>
                      <span className="font-medium text-foreground">
                        {response?.status ?? 200} OK
                      </span>
                      <span className="text-emerald-500">●</span>
                    </div>
                    <button
                      className="flex items-center gap-1 text-foreground/50 hover:text-foreground"
                      type="button"
                    >
                      All
                      <svg
                        className="size-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  <SectionHeader
                    label="Cookies"
                    onToggle={() => setOpenRight((s) => ({ ...s, cookies: !s.cookies }))}
                    open={openRight.cookies}
                  />
                  <SectionHeader
                    label="Request Headers"
                    onToggle={() => setOpenRight((s) => ({ ...s, reqHeaders: !s.reqHeaders }))}
                    open={openRight.reqHeaders}
                    right={
                      <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px]">
                        1
                      </span>
                    }
                  />
                  <SectionHeader
                    label="Response Headers"
                    onToggle={() => setOpenRight((s) => ({ ...s, resHeaders: !s.resHeaders }))}
                    open={openRight.resHeaders}
                    right={
                      <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px]">
                        12
                      </span>
                    }
                  />
                  <SectionHeader
                    label="Body"
                    onToggle={() => setOpenRight((s) => ({ ...s, body: !s.body }))}
                    open={openRight.body}
                    right={
                      <span className="flex items-center gap-1 text-[11px] text-foreground/50">
                        <svg
                          className="size-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Download
                      </span>
                    }
                  />
                  {openRight.body && response ? (
                    <div className="border-foreground/5 border-t">
                      <div className="flex items-center justify-between border-foreground/5 border-b px-4 py-2 text-[11px]">
                        <span className="text-foreground/50">application/json</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5 rounded-md bg-foreground/5 p-0.5">
                            <button
                              className={`rounded px-2 py-0.5 transition-colors ${
                                bodyView === "preview"
                                  ? "bg-foreground/15 text-foreground"
                                  : "text-foreground/50 hover:text-foreground"
                              }`}
                              onClick={() => setBodyView("preview")}
                              type="button"
                            >
                              Preview
                            </button>
                            <button
                              className={`rounded px-2 py-0.5 transition-colors ${
                                bodyView === "raw"
                                  ? "bg-foreground/15 text-foreground"
                                  : "text-foreground/50 hover:text-foreground"
                              }`}
                              onClick={() => setBodyView("raw")}
                              type="button"
                            >
                              Raw
                            </button>
                          </div>
                          <button
                            className="flex items-center gap-1 text-foreground/50 hover:text-foreground"
                            onClick={() => navigator.clipboard?.writeText(response.body)}
                            type="button"
                          >
                            Copy
                            <svg
                              className="size-3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.75}
                              viewBox="0 0 24 24"
                            >
                              <rect height="13" rx="2" width="13" x="9" y="8" />
                              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <JsonBody body={response.body} mode={bodyView} />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </FadeUp>
        )}
      </div>
    </section>
  );
}

interface SdkFile {
  id: string;
  filename: string;
  language: BundledLanguage;
  added: number;
  code: string;
  icon: IconSvgElement;
}

const SDK_FILES: SdkFile[] = [
  {
    added: 0,
    code: `$ bun add @cobalt-money/sdk

 bun add v1.1.34

 + @cobalt-money/sdk@1.4.2

 1 package installed [428.00ms]

$ bun run dev
 $ next dev --turbo

   ▲ Next.js 15.2.0 (turbo)
   - Local:   http://localhost:3000
   - Network: http://192.168.1.42:3000

 ✓ Ready in 612ms
 ✓ Compiled /net-worth in 184ms
 GET /net-worth 200 in 27ms`,
    filename: "install.sh",
    icon: ComputerTerminal01Icon,
    id: "install",
    language: "bash",
  },
  {
    added: 38,
    code: `import { Cobalt } from "@cobalt-money/sdk";

export const cobalt = new Cobalt({
  apiKey: process.env.COBALT_KEY!,
});

export async function fetchAccounts() {
  const { accounts } = await cobalt.accounts.list();
  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: a.balance,
  }));
}`,
    filename: "lib/accounts.ts",
    icon: JavaScriptIcon,
    id: "accounts",
    language: "typescript",
  },
  {
    added: 64,
    code: `from cobalt import Cobalt
import os
from collections import defaultdict

cobalt = Cobalt(api_key=os.environ["COBALT_KEY"])

def net_worth_series(days: int = 90):
    history = cobalt.balances.history(days=days)

    by_date: dict[str, float] = defaultdict(float)
    for snap in history.snapshots:
        by_date[snap.date] += snap.balance

    return [
        {"date": d, "total": t}
        for d, t in sorted(by_date.items())
    ]`,
    filename: "lib/net_worth.py",
    icon: PythonIcon,
    id: "networth",
    language: "python",
  },
  {
    added: 24,
    code: `curl https://api.cobaltpf.com/api/balances/history?days=90 \\
  -H "Authorization: Bearer $COBALT_KEY" \\
  -H "accept: application/json" \\
  | jq '
      .snapshots
      | group_by(.date)
      | map({
          date: .[0].date,
          total: (map(.balance) | add)
        })
      | sort_by(.date)
    '`,
    filename: "scripts/networth.sh",
    icon: ComputerTerminal01Icon,
    id: "curl",
    language: "bash",
  },
];

function SdkPanel() {
  const [activeId, setActiveId] = useState<string>(SDK_FILES[0]?.id ?? "");
  const file = SDK_FILES.find((f) => f.id === activeId) ?? SDK_FILES[0];
  if (!file) {
    return null;
  }
  return (
    <FadeUp
      className="overflow-hidden rounded-2xl border border-white/15 bg-background/70 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl backdrop-saturate-150"
      delay={0.1}
      y={24}
    >
      {/* macOS chrome */}
      <div className="relative flex items-center border-foreground/10 border-b px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="-translate-x-1/2 absolute left-1/2 text-[12px] text-foreground/50">
          Cobalt SDK
        </div>
        <a
          className="ml-auto text-[12px] text-foreground/50 hover:text-foreground"
          href="https://www.npmjs.com/package/@cobalt-money/sdk"
          rel="noopener noreferrer"
          target="_blank"
        >
          Get SDK
        </a>
      </div>

      {/* Tab strip */}
      <div className="flex items-stretch">
        {SDK_FILES.map((f) => {
          const isActive = f.id === activeId;
          return (
            <button
              className={`group flex min-w-0 items-center gap-2 border-foreground/10 border-r px-4 py-2.5 font-mono text-[12px] transition-colors ${
                isActive
                  ? "text-foreground"
                  : "border-b bg-foreground/[0.06] text-foreground/50 hover:text-foreground"
              }`}
              key={f.id}
              onClick={() => setActiveId(f.id)}
              type="button"
            >
              <HugeiconsIcon
                className="size-3.5 shrink-0 text-foreground/60"
                icon={f.icon}
                strokeWidth={1.5}
              />
              <span className="truncate">{f.filename}</span>
              <svg
                aria-hidden
                className={`size-3 transition-opacity ${
                  isActive ? "text-foreground/40 group-hover:text-foreground" : "opacity-0"
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                viewBox="0 0 24 24"
              >
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
              </svg>
            </button>
          );
        })}
        <div className="flex-1 border-foreground/10 border-b bg-foreground/[0.06]" />
      </div>

      {/* Editor body */}
      <div
        className="flex min-h-[420px] overflow-x-auto px-4 py-3 text-[12px] leading-[1.2] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/20"
        style={{ fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace" }}
      >
        {file.id === "install" ? null : (
          <pre className="select-none pr-3 text-right text-foreground/30">
            {Array.from({
              length: Math.max(27, file.code.split("\n").length),
            }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable per render
              <div key={i}>{i + 1}</div>
            ))}
          </pre>
        )}
        <pre className="min-w-0 flex-1">
          <HighlightedCode code={file.code} language={file.language} />
        </pre>
      </div>
    </FadeUp>
  );
}

function JsonBody({ body, mode }: { body: string; mode: "preview" | "raw" }) {
  const lines = body.split("\n");
  if (mode === "raw") {
    return (
      <pre
        className="overflow-x-auto px-4 py-4 text-[12px] leading-[1.6] text-foreground [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/20 [&::-webkit-scrollbar-thumb:hover]:bg-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent"
        style={{ fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace" }}
      >
        <code>{body}</code>
      </pre>
    );
  }
  return (
    <div
      className="px-2 py-3 text-[12px] leading-[1.6]"
      style={{ fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace" }}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        <div className="select-none text-right text-foreground/30">
          {lines.map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable per render
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="min-w-0 whitespace-pre-wrap break-all">
          <HighlightedCode code={body} language={SHIKI_LANG.json} />
        </pre>
      </div>
    </div>
  );
}

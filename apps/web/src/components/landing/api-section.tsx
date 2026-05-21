import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import type { BundledLanguage, ThemedToken } from "shiki";

type Lang = "curl" | "ts" | "python";

const LANG_LABEL: Record<Lang, string> = {
  curl: "cURL",
  python: "Python",
  ts: "TypeScript",
};

const SHIKI_LANG: Record<Lang | "json", BundledLanguage> = {
  curl: "bash",
  json: "json",
  python: "python",
  ts: "typescript",
};

function HighlightedCode({ code, language }: { code: string; language: BundledLanguage }) {
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);
  const { resolvedTheme } = useTheme();
  const shikiTheme = resolvedTheme === "light" ? "github-light-default" : "github-dark-default";

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
    <code>
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

interface EndpointDef {
  id: string;
  method: "GET";
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
      { defaultValue: "", enabled: true, key: "accountType" },
      { defaultValue: "", enabled: true, key: "cursor" },
      { defaultValue: "", enabled: true, key: "endDate" },
      { defaultValue: "50", enabled: true, key: "limit" },
      { defaultValue: "", enabled: true, key: "maxAmount" },
      { defaultValue: "", enabled: true, key: "minAmount" },
      { defaultValue: "true", enabled: true, key: "pendingFilter" },
      { defaultValue: "", enabled: true, key: "primaryCategory" },
      { defaultValue: "", enabled: true, key: "searchQuery" },
      { defaultValue: "", enabled: true, key: "startDate" },
    ],
    path: "/api/transactions",
    response: {
      hasMore: true,
      nextCursor: "eyJkIjoiMjAyNi0wNC0xMyIsImki0iJiNDI5YTBmOC1iYTFkLTRlMWUtOTI",
      transactions: [
        {
          accountLogoDomain: null,
          accountName: "EVERYDAY CHECKING ...1595",
          accountSubtype: "checking",
          accountType: "depository",
          amount: 239,
          authorizedDate: "2026-05-20",
          category: {
            groupName: "Loan Payments",
            groupSystemKey: "loan_payments",
            iconKey: "student_loan",
            id: "eda23a7e-d82b-4f0b-840a-a38b40e0a9cd",
            name: "Student Loan",
            systemKey: "student_loan",
          },
          counterparties: [
            {
              confidence_level: "LOW",
              entity_id: null,
              logo_url: null,
              name: "Dept Education Student Ln",
              phone_number: null,
              type: "merchant",
              website: null,
            },
          ],
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
    path: "/api/accounts",
    response: {
      accounts: [
        {
          balance: { available: 4118.54, currency: "USD", current: 4218.54 },
          id: "acc_0x7a",
          institution: "Wells Fargo",
          name: "EVERYDAY CHECKING ...1595",
          subtype: "checking",
          type: "depository",
        },
        {
          balance: { available: null, currency: "USD", current: 38_240.11 },
          id: "acc_0x7b",
          institution: "Fidelity",
          name: "Roth IRA",
          subtype: "ira",
          type: "investment",
        },
        {
          balance: { available: 9387.6, currency: "USD", current: -612.4 },
          id: "acc_0x7c",
          institution: "Chase",
          name: "Sapphire Reserve",
          subtype: "credit_card",
          type: "credit",
        },
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
    path: "/api/holdings",
    response: {
      holdings: [
        {
          accountId: "acc_0x7b",
          costBasis: 18_900.42,
          marketValue: 32_812.18,
          quantity: 142.13,
          symbol: "VTI",
          unrealizedPnl: 13_911.76,
        },
        {
          accountId: "acc_0x7b",
          costBasis: 4200,
          marketValue: 5427.93,
          quantity: 12,
          symbol: "NVDA",
          unrealizedPnl: 1227.93,
        },
      ],
    },
  },
  {
    group: "Reference",
    headers: DEFAULT_HEADERS,
    id: "categories.list",
    method: "GET",
    name: "List categories",
    params: [{ defaultValue: "", enabled: true, key: "group" }],
    path: "/api/categories",
    response: {
      categories: [
        { group: "Spending", id: "cat_food", name: "Food & Drink", systemKey: "food_and_drink" },
        { group: "Housing", id: "cat_rent", name: "Rent", systemKey: "rent_and_utilities" },
        { group: "Income", id: "cat_income", name: "Payroll", systemKey: "income" },
      ],
    },
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
    <button
      aria-checked={checked}
      className={`flex size-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
        checked
          ? "border-foreground/60 bg-foreground/10 text-foreground"
          : "border-foreground/15 text-transparent hover:border-foreground/30"
      }`}
      onClick={() => onChange(!checked)}
      role="checkbox"
      type="button"
    >
      <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
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
              <span className="font-mono text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
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

function buildSnippet(lang: Lang, endpoint: EndpointDef, queryRows: ParamRow[]): string {
  const enabled = queryRows.filter((r) => r.enabled && r.key && r.defaultValue);
  const qs =
    enabled.length > 0
      ? `?${enabled.map((r) => `${r.key}=${encodeURIComponent(r.defaultValue)}`).join("&")}`
      : "";
  const sdkCall = endpoint.id;
  if (lang === "curl") {
    return [
      `curl https://api.cobaltpf.com${endpoint.path}${qs} \\`,
      `  -H "Authorization: Bearer $COBALT_KEY" \\`,
      `  -H "accept: application/json"`,
    ].join("\n");
  }
  if (lang === "python") {
    const args = enabled.map((r) => `    ${r.key}=${JSON.stringify(r.defaultValue)},`).join("\n");
    return `from cobalt import Cobalt

cobalt = Cobalt(api_key=os.environ["COBALT_KEY"])

result = cobalt.${sdkCall}(${args ? `\n${args}\n` : ""})`;
  }
  const args = enabled.map((r) => `  ${r.key}: ${JSON.stringify(r.defaultValue)},`).join("\n");
  return `import { Cobalt } from "@cobalt/sdk";

const cobalt = new Cobalt({ apiKey: process.env.COBALT_KEY });

const result = await cobalt.${sdkCall}(${args ? `{\n${args}\n}` : ""});`;
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
    snippet: true,
  });
  const [openRight, setOpenRight] = useState({
    body: true,
    cookies: false,
    reqHeaders: false,
    resHeaders: false,
  });
  const [lang, setLang] = useState<Lang>("curl");
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

  const snippet = useMemo(() => buildSnippet(lang, endpoint, query), [lang, endpoint, query]);

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
    <section className="border-t px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Your money, as an API
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            No need to manage webhooks or infra just to access your finances.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-background shadow-2xl">
          {/* Top bar */}
          <div className="flex items-center gap-2 border-b px-3 py-2.5">
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
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-emerald-700 dark:text-emerald-400">
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
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-1.5 text-[13px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
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
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[13px] font-medium text-foreground/80 hover:bg-foreground/5"
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
            <div className="grid min-w-0 flex-1 lg:grid-cols-2">
              {/* Left: request */}
              <div className="border-foreground/5 lg:border-r">
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

                <SectionHeader
                  label="Code Snippet"
                  onToggle={() => setOpenLeft((s) => ({ ...s, snippet: !s.snippet }))}
                  open={openLeft.snippet}
                />
                {openLeft.snippet ? (
                  <div className="border-foreground/5 border-t">
                    <div className="flex items-center gap-1 border-foreground/5 border-b px-3 py-2">
                      {(["curl", "ts", "python"] as const).map((l) => (
                        <button
                          className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                            l === lang
                              ? "bg-foreground/10 text-foreground"
                              : "text-foreground/50 hover:text-foreground"
                          }`}
                          key={l}
                          onClick={() => setLang(l)}
                          type="button"
                        >
                          {LANG_LABEL[l]}
                        </button>
                      ))}
                    </div>
                    <pre
                      className="overflow-x-auto px-4 py-3 text-[12px] leading-[1.6] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/20 [&::-webkit-scrollbar-thumb:hover]:bg-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent"
                      style={{ fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace" }}
                    >
                      <HighlightedCode code={snippet} language={SHIKI_LANG[lang]} />
                    </pre>
                  </div>
                ) : null}
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
        </div>
      </div>
    </section>
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

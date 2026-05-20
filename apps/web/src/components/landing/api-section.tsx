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

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const { codeToTokens } = await import("shiki");
        const result = await codeToTokens(code, {
          lang: language,
          theme: "github-dark-default",
        });
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
  }, [code, language]);

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
// Mock API — endpoint catalogue + canned responses.
// Landing playground is fully client-side: clicking "Run" fakes latency
// and returns a deterministic JSON body for the chosen endpoint.
// ---------------------------------------------------------------------------

interface ParamDef {
  key: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
}

interface EndpointDef {
  id: string;
  method: "GET";
  path: string;
  summary: string;
  params: ParamDef[];
  buildResponse: (params: Record<string, string>) => unknown;
}

const ENDPOINTS: EndpointDef[] = [
  {
    buildResponse: () => {
      const all = [
        { amount: -84.2, category: "groceries", id: "tx_0x4a", merchant: "Whole Foods" },
        { amount: -18.4, category: "transit", id: "tx_0x4b", merchant: "Uber" },
        { amount: -15.49, category: "subscription", id: "tx_0x4c", merchant: "Netflix" },
        { amount: -10.99, category: "subscription", id: "tx_0x4d", merchant: "Spotify" },
        { amount: -500, category: "investment", id: "tx_0x4e", merchant: "Vanguard" },
        { amount: -52.34, category: "food_and_drink", id: "tx_0x4f", merchant: "DoorDash" },
        { amount: 3240, category: "income", id: "tx_0x50", merchant: "Payroll" },
        { amount: -45.67, category: "transit", id: "tx_0x51", merchant: "Shell" },
        { amount: -156.23, category: "utilities", id: "tx_0x52", merchant: "PG&E" },
        { amount: -2400, category: "rent", id: "tx_0x53", merchant: "Landlord" },
      ];
      return {
        data: all.slice(0, 5),
        next_cursor: "cur_8a91q2",
      };
    },
    id: "transactions.list",
    method: "GET",
    params: [],
    path: "/v1/transactions",
    summary: "List transactions",
  },
  {
    buildResponse: () => ({
      data: [
        {
          id: "acc_01h",
          institution: "Chase",
          mask: "0142",
          name: "Chase Sapphire",
          subtype: "credit_card",
          type: "credit",
        },
        {
          id: "acc_02j",
          institution: "Fidelity",
          mask: "8821",
          name: "Fidelity Brokerage",
          subtype: "brokerage",
          type: "investment",
        },
        {
          id: "acc_03k",
          institution: "Wells Fargo",
          mask: "3309",
          name: "Wells Fargo Checking",
          subtype: "checking",
          type: "depository",
        },
      ],
    }),
    id: "accounts.list",
    method: "GET",
    params: [],
    path: "/v1/accounts",
    summary: "List accounts",
  },
  {
    buildResponse: () => ({
      data: [
        { account_id: "acc_01h", available: 1840.55, currency: "USD", current: 1840.55 },
        { account_id: "acc_02j", available: 84_320.12, currency: "USD", current: 84_320.12 },
        { account_id: "acc_03k", available: 12_640, currency: "USD", current: 12_640 },
      ],
      total_net_worth: 98_800.67,
    }),
    id: "balances.list",
    method: "GET",
    params: [],
    path: "/v1/balances",
    summary: "List balances",
  },
  {
    buildResponse: () => ({
      data: [
        { cost_basis: 18_200, quantity: 142.3, symbol: "VTI", value: 36_420.21 },
        { cost_basis: 9100, quantity: 12, symbol: "AAPL", value: 2480.4 },
        { cost_basis: 22_400, quantity: 0.42, symbol: "BTC", value: 28_430 },
      ],
    }),
    id: "holdings.list",
    method: "GET",
    params: [],
    path: "/v1/holdings",
    summary: "List holdings",
  },
  {
    buildResponse: () => ({
      data: [
        { group: "Food & Drink", id: "cat_food_drink_restaurants", name: "Restaurants" },
        { group: "Food & Drink", id: "cat_food_drink_groceries", name: "Groceries" },
        { group: "Transportation", id: "cat_transit_rideshare", name: "Rideshare" },
        { group: "Entertainment", id: "cat_entertainment_streaming", name: "Streaming" },
        { group: "Rent & Utilities", id: "cat_utilities_electric", name: "Electric" },
      ],
    }),
    id: "categories.list",
    method: "GET",
    params: [],
    path: "/v1/categories",
    summary: "List categories",
  },
];

function buildQueryString(params: Record<string, string>): string {
  const entries = Object.entries(params).filter(([, v]) => v.trim().length > 0);
  if (entries.length === 0) {
    return "";
  }
  const usp = new URLSearchParams();
  for (const [k, v] of entries) {
    usp.set(k, v);
  }
  return `?${usp.toString()}`;
}

function buildSnippet(lang: Lang, endpoint: EndpointDef, params: Record<string, string>): string {
  const qs = buildQueryString(params);
  const pathFull = `${endpoint.path}${qs}`;
  if (lang === "curl") {
    const lines = [
      `curl https://api.cobaltpf.com${pathFull} \\`,
      `  -H "Authorization: Bearer $COBALT_KEY"`,
    ];
    return lines.join("\n");
  }
  if (lang === "python") {
    const argList = endpoint.params
      .filter((p) => (params[p.key] ?? "").trim().length > 0)
      .map((p) => `    ${p.key}=${JSON.stringify(params[p.key] ?? "")},`)
      .join("\n");
    const callPath = endpoint.id.replaceAll(".", ".");
    return `from cobalt import Cobalt

cobalt = Cobalt(api_key=os.environ["COBALT_KEY"])

result = cobalt.${callPath}(${argList ? `\n${argList}\n` : ""})`;
  }
  // ts
  const tsArgs = endpoint.params
    .filter((p) => (params[p.key] ?? "").trim().length > 0)
    .map((p) => `  ${p.key}: ${JSON.stringify(params[p.key] ?? "")},`)
    .join("\n");
  const tsCall = endpoint.id.replaceAll(".", ".");
  return `import { Cobalt } from "@cobalt/sdk";

const cobalt = new Cobalt({ apiKey: process.env.COBALT_KEY });

const result = await cobalt.${tsCall}(${tsArgs ? `{\n${tsArgs}\n}` : ""});`;
}

interface ResponseState {
  status: number;
  latencyMs: number;
  body: string;
}

function ResponseStatus({
  loading,
  response,
}: {
  loading: boolean;
  response: ResponseState | null;
}) {
  if (response) {
    return (
      <>
        <span className="text-emerald-400">●</span>
        <span>{response.status} OK</span>
        <span className="text-white/30">·</span>
        <span>{response.latencyMs}ms</span>
      </>
    );
  }
  if (loading) {
    return (
      <>
        <span className="text-amber-400">●</span>
        <span>Awaiting response…</span>
      </>
    );
  }
  return (
    <>
      <span className="text-white/30">○</span>
      <span>No request yet — hit Run</span>
    </>
  );
}

function defaultParamsFor(endpoint: EndpointDef): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of endpoint.params) {
    out[p.key] = p.defaultValue;
  }
  return out;
}

export function ApiSection() {
  const [lang, setLang] = useState<Lang>("ts");
  const [endpointId, setEndpointId] = useState<string>(ENDPOINTS[0]?.id ?? "");
  const endpoint = useMemo(
    () => ENDPOINTS.find((e) => e.id === endpointId) ?? ENDPOINTS[0],
    [endpointId],
  );
  const [params, setParams] = useState<Record<string, string>>(() =>
    endpoint ? defaultParamsFor(endpoint) : {},
  );
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset params + clear stale response when endpoint changes.
  useEffect(() => {
    if (!endpoint) {
      return;
    }
    setParams(defaultParamsFor(endpoint));
    setResponse(null);
  }, [endpoint]);

  const snippet = useMemo(
    () => (endpoint ? buildSnippet(lang, endpoint, params) : ""),
    [endpoint, lang, params],
  );

  const runRequest = () => {
    if (!endpoint) {
      return;
    }
    setLoading(true);
    const latency = 80 + Math.floor(Math.random() * 140);
    window.setTimeout(() => {
      const body = JSON.stringify(endpoint.buildResponse(params), null, 2);
      setResponse({ body, latencyMs: latency, status: 200 });
      setLoading(false);
    }, latency);
  };

  return (
    <section className="border-t px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Your money, as an API.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            One key. Every account. No webhooks, no Plaid item refreshes, no re-auth flows to
            babysit — just connect your app and read transactions, balances, holdings, and
            categories.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Request / playground */}
          <div className="flex flex-col overflow-hidden rounded-2xl border bg-[#1a1a1a] shadow-2xl">
            {/* Endpoint picker */}
            <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-3 py-2">
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-emerald-300">
                GET
              </span>
              <select
                aria-label="Endpoint"
                className="min-w-0 flex-1 rounded-md bg-white/5 px-2 py-1 text-[12px] text-white outline-none hover:bg-white/10 focus:ring-1 focus:ring-white/30"
                onChange={(e) => setEndpointId(e.target.value)}
                value={endpoint?.id ?? ""}
              >
                {ENDPOINTS.map((e) => (
                  <option key={e.id} value={e.id} className="bg-[#1a1a1a] text-white">
                    {e.path} — {e.summary}
                  </option>
                ))}
              </select>
              <button
                className="rounded-md bg-white/90 px-3 py-1 text-[12px] font-medium text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || !endpoint}
                onClick={runRequest}
                type="button"
              >
                {loading ? "Running…" : "Run"}
              </button>
            </div>

            {/* Language tabs */}
            <div className="flex items-center gap-1 border-b border-white/5 px-3 py-2">
              {(["curl", "ts", "python"] as const).map((l) => (
                <button
                  className={`rounded-md px-3 py-1 text-[12px] transition-colors ${
                    l === lang ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
                  }`}
                  key={l}
                  onClick={() => setLang(l)}
                  type="button"
                >
                  {LANG_LABEL[l]}
                </button>
              ))}
              <span className="ml-auto text-[11px] text-white/40">request</span>
            </div>
            <pre
              className="flex-1 overflow-x-auto px-5 py-4 text-[13px] leading-[1.7] text-[#e6e4dd]"
              style={{ fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace" }}
            >
              <HighlightedCode code={snippet} language={SHIKI_LANG[lang]} />
            </pre>
          </div>

          {/* Response */}
          <div className="flex flex-col overflow-hidden rounded-2xl border bg-[#1a1a1a] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2 text-[12px] text-white/55">
              <ResponseStatus loading={loading} response={response} />
              <span className="ml-auto text-[11px] text-white/40">response</span>
            </div>
            <pre
              className="min-h-[280px] flex-1 overflow-x-auto px-5 py-4 text-[12px] leading-[1.6] text-[#e6e4dd]"
              style={{ fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace" }}
            >
              {response ? (
                <HighlightedCode code={response.body} language={SHIKI_LANG.json} />
              ) : (
                <code className="text-white/40">
                  {loading ? "…" : "// Response will appear here."}
                </code>
              )}
            </pre>
          </div>
        </div>

        <div className="mt-10 text-center">
          <a
            className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            href="https://docs.cobaltpf.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            Read the API docs
          </a>
        </div>
      </div>
    </section>
  );
}

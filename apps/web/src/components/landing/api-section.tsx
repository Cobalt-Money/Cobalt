import { Badge } from "@cobalt-web/ui/components/badge";
import { useState } from "react";

type Lang = "curl" | "ts" | "python";

const LANG_LABEL: Record<Lang, string> = {
  curl: "cURL",
  python: "Python",
  ts: "TypeScript",
};

const SNIPPETS: Record<Lang, string> = {
  curl: `curl https://api.cobaltpf.com/v1/transactions \\
  -H "Authorization: Bearer $COBALT_KEY" \\
  -G \\
  -d period=30d \\
  -d limit=5`,
  python: `from cobalt import Cobalt

cobalt = Cobalt(api_key=os.environ["COBALT_KEY"])

tx = cobalt.transactions.list(
    period="30d",
    limit=5,
)`,
  ts: `import { Cobalt } from "@cobalt/sdk";

const cobalt = new Cobalt({ apiKey: process.env.COBALT_KEY });

const tx = await cobalt.transactions.list({
  period: "30d",
  limit: 5,
});`,
};

const RESPONSE = `{
  "data": [
    { "id": "tx_0x4a", "merchant": "Whole Foods",  "amount": -84.20,  "category": "groceries" },
    { "id": "tx_0x4b", "merchant": "Uber",         "amount": -18.40,  "category": "transit" },
    { "id": "tx_0x4c", "merchant": "Netflix",      "amount": -15.49,  "category": "subscription" },
    { "id": "tx_0x4d", "merchant": "Spotify",      "amount": -10.99,  "category": "subscription" },
    { "id": "tx_0x4e", "merchant": "Vanguard",     "amount": -500.00, "category": "investment" }
  ],
  "next_cursor": "cur_8a91...",
  "latency_ms": 124
}`;

export function ApiSection() {
  const [lang, setLang] = useState<Lang>("ts");

  return (
    <section className="px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <Badge variant="secondary">Cobalt API</Badge>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Your money, as an API.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            One key. Every account. Transactions, balances, holdings, categories — typed SDKs in
            TypeScript and Python, plus plain HTTP.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Request */}
          <div className="overflow-hidden rounded-2xl border bg-[#1a1a1a] shadow-2xl">
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
              className="overflow-x-auto px-5 py-4 text-[13px] leading-[1.7] text-[#e6e4dd]"
              style={{ fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace" }}
            >
              <code>{SNIPPETS[lang]}</code>
            </pre>
          </div>

          {/* Response */}
          <div className="overflow-hidden rounded-2xl border bg-[#1a1a1a] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2 text-[12px] text-white/55">
              <span className="text-emerald-400">●</span>
              <span>200 OK</span>
              <span className="text-white/30">·</span>
              <span>124ms</span>
              <span className="ml-auto text-[11px] text-white/40">response</span>
            </div>
            <pre
              className="overflow-x-auto px-5 py-4 text-[12px] leading-[1.6] text-[#e6e4dd]"
              style={{ fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace" }}
            >
              <code>{RESPONSE}</code>
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

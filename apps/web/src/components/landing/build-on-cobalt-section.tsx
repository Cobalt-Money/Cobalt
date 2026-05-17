import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { Badge } from "@cobalt-web/ui/components/badge";
import { Card, CardContent } from "@cobalt-web/ui/components/card";

const SAMPLE_TX = [
  { amt: "−$84.20", cat: "Groceries", merchant: "Whole Foods", website: "wholefoodsmarket.com" },
  { amt: "−$18.40", cat: "Transit", merchant: "Uber", website: "uber.com" },
  { amt: "−$15.49", cat: "Subscription", merchant: "Netflix", website: "netflix.com" },
  { amt: "−$10.99", cat: "Subscription", merchant: "Spotify", website: "spotify.com" },
  { amt: "−$500.00", cat: "Investment", merchant: "Vanguard", website: "vanguard.com" },
];

const BUILT_WITH = [
  "Discord & Slack bots",
  "Notion widgets",
  "Custom dashboards",
  "Personal CFO agents",
  "Spreadsheet sync",
  "Browser extensions",
];

export function BuildOnCobaltSection() {
  return (
    <section className="px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <Badge variant="secondary">Build on top of Cobalt</Badge>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Ship what we haven't.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            The same API powers Cobalt. Wire it into anything — a Discord bot, a Notion widget, a
            CFO agent. Ship in an afternoon.
          </p>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
          {/* Demo: Discord bot */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded bg-[#5865f2] text-[12px] font-bold text-white">
                    D
                  </div>
                  <span className="text-sm font-medium">#personal-cfo</span>
                  <span className="text-xs text-muted-foreground">
                    · Discord bot built on Cobalt
                  </span>
                </div>
                <Badge className="font-mono" variant="secondary">
                  /spend
                </Badge>
              </div>
              <div className="space-y-3 px-4 py-4">
                <div className="text-sm">
                  <span className="font-semibold text-foreground">Rust</span>
                  <span className="ml-2 text-xs text-muted-foreground">2:14 PM</span>
                  <div className="mt-0.5 text-muted-foreground">/spend last 30d</div>
                </div>
                <div className="text-sm">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <span className="flex size-4 items-center justify-center rounded bg-black text-[9px] font-bold text-[#d4a017]">
                      C
                    </span>
                    Cobalt Bot
                    <span className="ml-1 text-xs text-muted-foreground">2:14 PM</span>
                  </span>
                  <div className="mt-1 text-foreground">
                    You spent <strong>$3,840</strong> in the last 30 days — down 13% from October.
                    Top categories: Groceries ($612), Subscriptions ($487), Transit ($284).
                  </div>
                  <div className="mt-2 overflow-hidden rounded-md border">
                    {SAMPLE_TX.map((t, i) => (
                      <div
                        className={`flex items-center gap-3 px-3 py-2 ${i === 0 ? "" : "border-t"}`}
                        key={t.merchant}
                      >
                        <MerchantLogo
                          className="size-6"
                          counterparties={null}
                          logoUrl={null}
                          merchantName={t.merchant}
                          website={t.website}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium">{t.merchant}</div>
                          <div className="text-[10px] text-muted-foreground">{t.cat}</div>
                        </div>
                        <div className="text-xs tabular-nums">{t.amt}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Copy */}
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">Built with Cobalt</h3>
            <p className="mt-3 text-muted-foreground">
              Devs, founders, and tinkerers shipping on top of Cobalt's API and MCP.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {BUILT_WITH.map((t) => (
                <li
                  className="rounded-full border bg-card px-3 py-1.5 text-sm text-foreground/80"
                  key={t}
                >
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-xl border bg-card p-5">
              <div className="text-sm font-medium">Hackathon-ready</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Free dev tier. Sandbox account included. Bring your own Plaid keys or use ours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

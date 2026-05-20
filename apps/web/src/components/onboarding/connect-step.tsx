import { AccountLogo } from "@cobalt-web/ui/cobalt/accounts/account-logo";
import { LogoCDN } from "@cobalt-web/ui/cobalt/logos/logo-cdn";
import { useDemo } from "@cobalt-web/ui/hooks/use-demo";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useCommandMenu } from "@/components/shell/command-menu";
import { useAccounts } from "@/hooks/use-accounts";
import { authClient } from "@/lib/clients/auth-client";

const BRANDFETCH_CLIENT_ID = process.env.VITE_BRANDFETCH_CLIENT_ID || "";

const PREVIEW_BANKS = [
  { domain: "chase.com", name: "Chase" },
  { domain: "bankofamerica.com", name: "Bank of America" },
  { domain: "schwab.com", name: "Schwab" },
  { domain: "fidelity.com", name: "Fidelity" },
];

export function ConnectStep(_props: { onConnect: () => void }) {
  const { openAddAccount } = useCommandMenu();
  const { enter: enterDemo, pending: demoPending } = useDemo();
  const { items } = useAccounts();
  const hasAccounts = items.length > 0;

  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <h1 className="font-semibold text-2xl tracking-tight">
        {hasAccounts ? "Account connected" : "Connect your accounts"}
      </h1>

      {hasAccounts ? (
        <div className="flex w-full max-w-3xl flex-col gap-2">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3 text-left"
              >
                <AccountLogo
                  className="size-9 shrink-0"
                  institutionLogo={a.institutionLogo}
                  institutionLogosExtra={a.institutionLogosExtra}
                  logoDomain={a.institutionUrl}
                  name={a.institution}
                  source={a.source}
                  subtype={a.subtype}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-sm">{a.institution}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {a.accountTypeLabel}
                    {a.mask ? ` •• ${a.mask}` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <button
            className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-foreground/15 border-dashed py-2 text-muted-foreground text-xs hover:border-foreground/40 hover:text-foreground"
            onClick={() => openAddAccount()}
            type="button"
          >
            <HugeiconsIcon aria-hidden className="size-3.5" icon={PlusSignIcon} strokeWidth={2.5} />
            Connect another
          </button>
        </div>
      ) : (
        <button
          className="group flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border-2 border-foreground/15 border-dashed bg-muted/20 p-6 transition-colors hover:border-foreground/40 hover:bg-muted/40"
          onClick={() => openAddAccount()}
          type="button"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-background">
            <HugeiconsIcon aria-hidden className="size-5" icon={PlusSignIcon} strokeWidth={2.5} />
          </span>
          <span className="font-medium text-sm">Connect an account</span>
          <div className="flex items-center gap-2">
            {PREVIEW_BANKS.map((b) => (
              <LogoCDN
                className="size-7 overflow-hidden rounded-lg bg-muted"
                clientId={BRANDFETCH_CLIENT_ID}
                domain={b.domain}
                fallbackText={b.name[0] ?? ""}
                key={b.name}
                logoApiSize={48}
              />
            ))}
          </div>
        </button>
      )}

      {!hasAccounts && (
        <button
          className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground disabled:opacity-50"
          disabled={demoPending}
          onClick={() => {
            void (async () => {
              try {
                await authClient.updateUser({
                  onboardedAt: new Date(),
                  onboardingStep: null,
                });
              } catch {
                // ignore; demo entry still proceeds
              }
              await enterDemo();
            })();
          }}
          type="button"
        >
          {demoPending ? "Loading demo…" : "or try the demo →"}
        </button>
      )}
    </div>
  );
}

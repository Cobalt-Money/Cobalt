import type { AddAccountInstitution } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/types";
import { InstitutionLogo } from "@cobalt-web/ui/cobalt/logos/institution-logo";

interface Props {
  institution: AddAccountInstitution;
  /** Fired when the user chooses to link via Plaid/SnapTrade. */
  onChooseConnect: (institution: AddAccountInstitution) => void;
  /** Fired when the user chooses to track the account manually. */
  onChooseManual: () => void;
  /** True when free-tier cap reached; disables Link button + surfaces upgrade CTA. */
  linkDisabled?: boolean;
  /** Fired when the user clicks the upgrade CTA on the disabled Link button. */
  onUpgrade?: () => void;
}

export function LinkOrManualPage({
  institution,
  onChooseConnect,
  onChooseManual,
  linkDisabled = false,
  onUpgrade,
}: Props) {
  return (
    <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
      <h2 className="flex items-center gap-3 font-semibold text-foreground text-lg leading-none">
        <InstitutionLogo
          className="size-10 shrink-0 overflow-hidden rounded-lg"
          institutionLogo={institution.logo}
          institutionName={institution.name}
          institutionUrl={institution.url}
        />
        <span>{institution.name}</span>
      </h2>
      <p className="text-muted-foreground text-sm">How would you like to add this account?</p>
      <div className="flex flex-col gap-2 pt-1">
        {linkDisabled ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 opacity-80">
            <div className="flex min-w-0 flex-col gap-1 text-left">
              <span className="font-medium text-foreground text-sm">
                Link with {institution.provider === "plaid" ? "Plaid" : "SnapTrade"}
              </span>
              <span className="text-muted-foreground text-xs">Free tier limit reached.</span>
            </div>
            <button
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs transition-colors hover:bg-primary/90"
              onClick={onUpgrade}
              type="button"
            >
              Upgrade to Pro
            </button>
          </div>
        ) : (
          <button
            className="flex flex-col items-start gap-1 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 text-left transition-colors hover:bg-foreground/[0.07]"
            onClick={() => {
              onChooseConnect(institution);
            }}
            type="button"
          >
            <span className="font-medium text-foreground text-sm">
              Link with {institution.provider === "plaid" ? "Plaid" : "SnapTrade"}
            </span>
            <span className="text-muted-foreground text-xs">
              Auto-sync balances and transactions.
            </span>
          </button>
        )}
        <button
          className="flex flex-col items-start gap-1 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 text-left transition-colors hover:bg-foreground/[0.07]"
          onClick={onChooseManual}
          type="button"
        >
          <span className="font-medium text-foreground text-sm">Add manually</span>
          <span className="text-muted-foreground text-xs">
            Track balance yourself; no auto-sync.
          </span>
        </button>
      </div>
    </div>
  );
}

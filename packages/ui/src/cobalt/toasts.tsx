import { toast } from "sonner";

import { InstitutionLogo } from "./logos/institution-logo";

interface AccountToastInstitution {
  institution: string;
  institutionLogo: string | null;
  institutionLogosExtra?: readonly string[] | null;
  institutionUrl: string | null;
}

export const cobaltToast = {
  accountDisconnected(account: AccountToastInstitution) {
    return toast("Successfully deleted account", {
      description: (
        <span className="flex items-center gap-2">
          <InstitutionLogo
            className="size-4 rounded-sm"
            institutionLogo={account.institutionLogo}
            institutionLogosExtra={account.institutionLogosExtra ?? null}
            institutionName={account.institution}
            institutionUrl={account.institutionUrl}
          />
          <span>{account.institution}</span>
        </span>
      ),
      icon: <img alt="" className="size-4" src="/assets/vectors/posted.svg" />,
    });
  },

  accountsUpdated(account: AccountToastInstitution) {
    return toast("Accounts updated", {
      description: (
        <span className="flex items-center gap-2">
          <InstitutionLogo
            className="size-4 rounded-sm"
            institutionLogo={account.institutionLogo}
            institutionLogosExtra={account.institutionLogosExtra ?? null}
            institutionName={account.institution}
            institutionUrl={account.institutionUrl}
          />
          <span>{account.institution}</span>
        </span>
      ),
      icon: <img alt="" className="size-4" src="/assets/vectors/posted.svg" />,
    });
  },
};

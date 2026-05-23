interface FormatAlertArgs {
  type: string;
  institutionName: string | null | undefined;
}

interface FormattedAlert {
  title: string;
  message: string;
}

/**
 * Single source of truth for alert copy. Title and message are pure
 * projections of `(type, institutionName)` — never persisted, always
 * recomputed at read time so the rendered string stays in sync with the
 * authoritative institution name even after re-syncs / renames.
 */
export function formatAlert({ type, institutionName }: FormatAlertArgs): FormattedAlert {
  const name = (institutionName ?? "").trim() || "Your connection";

  switch (type) {
    case "connection_broken": {
      return {
        message: `Reconnect ${name} to resume syncing positions and activity.`,
        title: `${name} connection broken`,
      };
    }
    case "reauth_needed": {
      return {
        message: `Reconnect ${name} to resume syncing transactions and balances.`,
        title: `${name} needs re-authentication`,
      };
    }
    case "pending_disconnect": {
      return {
        message: `Reconnect ${name} now to avoid losing access.`,
        title: `${name} is about to disconnect`,
      };
    }
    case "new_accounts": {
      return {
        message: `New accounts were added at ${name}. Refresh to sync them.`,
        title: `New accounts available at ${name}`,
      };
    }
    default: {
      return { message: "", title: name };
    }
  }
}

/**
 * Tiny event bus that lets any call site open the upgrade modal.
 * <UpgradePromptHost> mounted at the root subscribes; everything else
 * just calls showUpgradePrompt(reason).
 */

export type UpgradeReason =
  | "connection_limit_reached"
  | "extended_thinking_not_allowed"
  | "model_not_allowed";

type Listener = (reason: UpgradeReason) => void;

const listeners = new Set<Listener>();

export function showUpgradePrompt(reason: UpgradeReason): void {
  for (const fn of listeners) {
    fn(reason);
  }
}

export function subscribeUpgradePrompt(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Inspect a non-ok fetch Response. If body matches one of the known tier
 * gate codes, opens the upgrade modal and returns true. Caller should skip
 * its own error toast in that case.
 */
export async function handleTierGateResponse(res: Response): Promise<boolean> {
  if (res.status !== 402 && res.status !== 403) {
    return false;
  }
  const clone = res.clone();
  try {
    const body = (await clone.json()) as { code?: unknown };
    const code = typeof body.code === "string" ? body.code : null;
    if (
      code === "connection_limit_reached" ||
      code === "model_not_allowed" ||
      code === "extended_thinking_not_allowed"
    ) {
      showUpgradePrompt(code);
      return true;
    }
  } catch {
    // Body wasn't JSON or had no `code` — not a tier gate.
  }
  return false;
}

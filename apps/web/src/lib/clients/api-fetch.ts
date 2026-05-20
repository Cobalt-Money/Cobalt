/**
 * `fetch` wrapper used by every Hono RPC client in `api-client.ts`.
 *
 * Today it does one thing: surface `demo_blocked` 403s as a toast so demo
 * users get a clear hint when they try to hit a gated route (Plaid connect,
 * Stripe billing portal, account delete, etc.) instead of a silent failure.
 *
 * Lives in its own file because `api-client.ts` should only assemble typed
 * proxies — anything observational (logging, retries, error UX) belongs
 * here so it can grow without ballooning that file's surface.
 */

const demoBlockedToastTimestamps = new Map<string, number>();
const DEMO_BLOCK_TOAST_COOLDOWN_MS = 3000;

async function notifyOnDemoBlocked(req: Request, res: Response): Promise<void> {
  if (res.status !== 403) {
    return;
  }
  let body: { code?: string; error?: string };
  try {
    body = (await res.clone().json()) as { code?: string; error?: string };
  } catch {
    return;
  }
  if (body.code !== "demo_blocked") {
    return;
  }
  // Throttle: same endpoint within the cooldown should not double-toast.
  const key = new URL(req.url).pathname;
  const last = demoBlockedToastTimestamps.get(key) ?? 0;
  const now = Date.now();
  if (now - last < DEMO_BLOCK_TOAST_COOLDOWN_MS) {
    return;
  }
  demoBlockedToastTimestamps.set(key, now);
  // Lazy import keeps sonner out of non-browser bundles.
  const { toast } = await import("sonner");
  toast.error("Not available in demo mode", {
    description: "Exit demo mode and sign in to connect your account.",
  });
}

export const apiFetch = async (
  input: URL | RequestInfo,
  options?: RequestInit,
): Promise<Response> => {
  const response = await fetch(input, options);
  const req =
    input instanceof Request ? input : new Request(input as string | URL, options ?? undefined);
  void notifyOnDemoBlocked(req, response);
  return response;
};

/**
 * Cheap check for callers: was this response the `demo_blocked` 403?
 *
 * Use to silence generic "failed to do X" toasts at the call site — apiFetch
 * has already surfaced a clear "Not available in demo mode" message, no need
 * to stack a second error.
 */
export async function isDemoBlockedResponse(res: Response): Promise<boolean> {
  if (res.status !== 403) {
    return false;
  }
  try {
    const body = (await res.clone().json()) as { code?: string };
    return body.code === "demo_blocked";
  } catch {
    return false;
  }
}

import { setTimeout as delay } from "node:timers/promises";

import { resumeHook } from "workflow/api";
import { HookNotFoundError } from "workflow/internal/errors";

/**
 * `start()` returns before the workflow body has executed past `createHook(...)`,
 * so an immediate `resumeHook()` can race and throw `HookNotFoundError`. Retry
 * with backoff until the hook is registered or the budget is exhausted.
 */
export async function resumeHookWithRetry<T>(
  token: string,
  payload: T,
  opts: { attempts?: number; baseDelayMs?: number } = {},
): Promise<void> {
  const { attempts = 20, baseDelayMs = 50 } = opts;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await resumeHook(token, payload);
      return;
    } catch (error) {
      if (!HookNotFoundError.is(error) || i === attempts - 1) {
        throw error;
      }
      await delay(baseDelayMs * 2 ** Math.min(i, 5));
    }
  }
}

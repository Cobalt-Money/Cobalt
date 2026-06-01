import { getUserLimits, MODELS } from "./limits.js";
import type { TierLimits } from "./limits.js";

/**
 * Capability registry. Each entry is a pure predicate over the user's tier
 * limits (+ optional caller-supplied context). Add a capability = one line
 * here, then `can(userId, "your:capability")` is type-safe everywhere.
 */
export const CAPABILITIES = {
  "connection:add": (l: TierLimits, ctx: { current: number }) => ctx.current < l.connections,
  "model:opus": (l: TierLimits) => l.models.includes(MODELS.opus),
  "thinking:extended": (l: TierLimits) => l.extendedThinking,
} as const;

export type Capability = keyof typeof CAPABILITIES;

type ContextOf<K extends Capability> = Parameters<(typeof CAPABILITIES)[K]>[1];

/**
 * Resolve whether a user has a given capability. Single chokepoint for all
 * tier-based gating: routes, workflows, agent model selection. Pulls limits
 * from DB; predicates themselves are pure and easily unit-tested.
 */
export async function can<K extends Capability>(
  userId: string,
  capability: K,
  ...ctx: ContextOf<K> extends undefined ? [] : [ContextOf<K>]
): Promise<boolean> {
  const limits = await getUserLimits(userId);
  const predicate = CAPABILITIES[capability] as (l: TierLimits, c?: ContextOf<K>) => boolean;
  return predicate(limits, ctx[0]);
}

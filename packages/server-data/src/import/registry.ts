import type { ImportAdapter, ImportSource } from "./types";

/**
 * Adapter registry. Empty pending the AI-mapped generic CSV adapter.
 * Per-provider adapters were removed in favor of header-name fuzzy match + LLM column
 * mapping; vendors don't publish stable CSV schemas, so a generic mapper avoids the
 * maintenance treadmill of chasing format drift.
 */
const adapters: readonly ImportAdapter<unknown>[] = [];

export function getAdapter(source: ImportSource): ImportAdapter<unknown> {
  const found = adapters.find((a) => a.source === source);
  if (!found) {
    throw new Error(`No import adapter registered for source: ${source}`);
  }
  return found;
}

/** Sniff the first ~5 lines of a file against each adapter's `detect()`. Returns null on no match. */
export function detectSource(sample: string): ImportSource | null {
  for (const adapter of adapters) {
    if (adapter.detect(sample)) {
      return adapter.source;
    }
  }
  return null;
}

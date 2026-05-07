import { mintAdapter } from "./mint/adapter";
import type { ImportAdapter, ImportSource } from "./types";

/**
 * Adapter registry. Order doesn't matter for `detectSource` since `detect()` calls are
 * mutually exclusive — header sniffs target each provider's distinct column set.
 */
const adapters = [mintAdapter] as const satisfies readonly ImportAdapter<unknown>[];

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

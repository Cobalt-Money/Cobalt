import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { mutators } from "@cobalt-web/zero/mutators";
import type { MutatorResultErrorDetails, PromiseWithServerResult } from "@rocicorp/zero";
import { useZero } from "@rocicorp/zero/react";
import { useCallback } from "react";

type Mutators = typeof mutators;
type MutateRequest = Parameters<ReturnType<typeof useZero>["mutate"]>[0];
type MutateBuilder = (m: Mutators) => MutateRequest;

export type MutatorError = MutatorResultErrorDetails["error"];

export interface MutateOpts {
  fallback?: string;
  /** Custom error handler. Replaces the default toast. */
  onError?: (err: MutatorError) => void;
  /** Suppress the default toast and skip onError. Server failures only logged by Zero. */
  silent?: boolean;
}

export function useMutator() {
  const zero = useZero();
  return useCallback(
    (build: MutateBuilder, fallbackOrOpts: string | MutateOpts = {}): PromiseWithServerResult => {
      const opts: MutateOpts =
        typeof fallbackOrOpts === "string" ? { fallback: fallbackOrOpts } : fallbackOrOpts;
      const handle = zero.mutate(build(mutators));
      void (async () => {
        const r = await handle.server;
        if (r.type !== "error") {
          return;
        }
        if (opts.silent) {
          return;
        }
        if (opts.onError) {
          opts.onError(r.error);
          return;
        }
        cobaltToast.error(r.error.message || opts.fallback || "Something went wrong.");
      })();
      return handle;
    },
    [zero],
  );
}

// Entry bundled (via `scripts/build-stdlib.ts`) into an IIFE that is prepended
// to user code in the V8 isolate sandbox. Exposes `globalThis.__cobaltStdlib`;
// `runWithBindings` splices it onto the `cobalt.*` root as `cobalt.calc`.
//
// Keep this file pure-JS deterministic — anything imported here ships into
// every sandbox execution.
import * as tvm from "financial";

const stdlib = { tvm };

(globalThis as unknown as { __cobaltStdlib: typeof stdlib }).__cobaltStdlib = stdlib;

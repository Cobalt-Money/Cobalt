/* eslint-disable promise/avoid-new, promise/prefer-await-to-then, unicorn/consistent-function-scoping, require-await -- low-level WASM driver: queue serializer needs raw Promise + resolver pattern; async dispose matches IsolateContext interface; release() is a per-call captured closure. */
import variant from "@jitl/quickjs-singlefile-mjs-release-asyncify";
import type {
  ExecutionResult,
  IsolateConfig,
  IsolateContext,
  IsolateDriver,
} from "@tanstack/ai-code-mode";
import { wrapCode } from "@tanstack/ai-code-mode";
import type { QuickJSHandle } from "quickjs-emscripten-core";
import { newQuickJSAsyncWASMModuleFromVariant } from "quickjs-emscripten-core";

/**
 * Singlefile QuickJS driver. Uses `@jitl/quickjs-singlefile-mjs-release-asyncify`
 * which embeds the WASM bytes inside the JS module — no `new URL(...wasm)`
 * lookup, so the bundled Nitro output works without copying WASM assets.
 *
 * Behavior mirrors `@tanstack/ai-isolate-quickjs`'s driver (asyncified
 * tool bindings, console capture, JSON-stringified return values) but
 * replaces the WASM-loading variant.
 */

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MEMORY_LIMIT_MB = 128;
const DEFAULT_MAX_STACK_BYTES = 512 * 1024;

let modulePromise: ReturnType<
  typeof newQuickJSAsyncWASMModuleFromVariant
> | null = null;
const getModule = () => {
  if (!modulePromise) {
    modulePromise = newQuickJSAsyncWASMModuleFromVariant(variant);
  }
  return modulePromise;
};

let execQueue: Promise<unknown> = Promise.resolve();

export function createQuickJSIsolateDriver(): IsolateDriver {
  return {
    async createContext(config: IsolateConfig): Promise<IsolateContext> {
      const timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
      const memoryMb = config.memoryLimit ?? DEFAULT_MEMORY_LIMIT_MB;

      const module = await getModule();
      const vm = module.newContext();
      vm.runtime.setMemoryLimit(memoryMb * 1024 * 1024);
      vm.runtime.setMaxStackSize(DEFAULT_MAX_STACK_BYTES);

      const logs: string[] = [];

      // console.log/error/warn/info — push into logs.
      const consoleObj = vm.newObject();
      const makeMethod = (prefix: string) =>
        vm.newFunction(
          `console.${prefix || "log"}`,
          (...args: QuickJSHandle[]) => {
            const parts = args.map((a) => vm.getString(a));
            logs.push(
              prefix ? `${prefix}: ${parts.join(" ")}` : parts.join(" ")
            );
          }
        );
      const logFn = makeMethod("");
      const errFn = makeMethod("ERROR");
      const warnFn = makeMethod("WARN");
      const infoFn = makeMethod("INFO");
      vm.setProp(consoleObj, "log", logFn);
      vm.setProp(consoleObj, "error", errFn);
      vm.setProp(consoleObj, "warn", warnFn);
      vm.setProp(consoleObj, "info", infoFn);
      vm.setProp(vm.global, "console", consoleObj);
      logFn.dispose();
      errFn.dispose();
      warnFn.dispose();
      infoFn.dispose();
      consoleObj.dispose();

      // Inject each binding as `__<name>_impl` (asyncified host call) plus a
      // friendly `<name>(input)` wrapper that JSON-marshals args.
      for (const [name, binding] of Object.entries(config.bindings)) {
        const impl = vm.newAsyncifiedFunction(
          name,
          async (argsHandle: QuickJSHandle) => {
            try {
              const argsJson = vm.getString(argsHandle);
              const args = JSON.parse(argsJson);
              const result = await binding.execute(args);
              return vm.newString(
                JSON.stringify({ success: true, value: result })
              );
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              return vm.newString(
                JSON.stringify({ error: message, success: false })
              );
            }
          }
        );
        vm.setProp(vm.global, `__${name}_impl`, impl);
        impl.dispose();

        const wrapperSrc = `
          async function ${name}(input) {
            const json = await __${name}_impl(JSON.stringify(input));
            const r = JSON.parse(json);
            if (!r.success) throw new Error(r.error);
            return r.value;
          }
        `;
        const evalRes = vm.evalCode(wrapperSrc);
        if (evalRes.error) {
          const errStr = vm.dump(evalRes.error);
          evalRes.error.dispose();
          throw new Error(`Failed to install wrapper for ${name}: ${errStr}`);
        }
        evalRes.value.dispose();
      }

      let disposed = false;
      const ctx: IsolateContext = {
        async dispose() {
          if (disposed) {
            return;
          }
          disposed = true;
          vm.dispose();
        },
        async execute<T = unknown>(code: string): Promise<ExecutionResult<T>> {
          let release: () => void = () => {
            /* set below */
          };
          const myTurn = new Promise<void>((resolve) => {
            release = resolve;
          });
          const prev = execQueue;
          execQueue = myTurn;
          await prev;

          if (disposed) {
            release();
            return {
              error: { message: "Context disposed", name: "DisposedError" },
              logs: [],
              success: false,
            };
          }
          logs.length = 0;

          const deadline = Date.now() + timeout;
          vm.runtime.setInterruptHandler(() => Date.now() > deadline);
          try {
            const wrapped = wrapCode(code);
            const evalResult = await vm.evalCodeAsync(wrapped);
            try {
              const promiseHandle = vm.unwrapResult(evalResult);
              const native = vm.resolvePromise(promiseHandle);
              promiseHandle.dispose();
              vm.runtime.executePendingJobs();
              const resolved = await native;
              const valueHandle = vm.unwrapResult(resolved);
              const dumped = vm.dump(valueHandle);
              valueHandle.dispose();
              let parsed: unknown = dumped;
              if (typeof dumped === "string") {
                try {
                  parsed = JSON.parse(dumped);
                } catch {
                  parsed = dumped;
                }
              }
              return { logs: [...logs], success: true, value: parsed as T };
            } catch (error) {
              return {
                error: {
                  message:
                    error instanceof Error ? error.message : String(error),
                  name: error instanceof Error ? error.name : "Error",
                },
                logs: [...logs],
                success: false,
              };
            }
          } finally {
            if (!disposed) {
              vm.runtime.setInterruptHandler(() => false);
            }
            release();
          }
        },
      };
      return ctx;
    },
  };
}

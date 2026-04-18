import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const SSR_STUB_PREFIX = "\0ssr-stub:";

/**
 * Packages that use WASM or are client-only (shiki syntax highlighting,
 * streamdown markdown streaming). These can't be bundled by Nitro's Rolldown
 * builder (WASM loading fails), so we stub them as empty modules on the server.
 * Safe because `_auth/route.tsx` returns null while `useAppSession()` is
 * pending, which is always the case during SSR — the components that import
 * these packages never render server-side.
 */
const ssrStubPackages = [
  "shiki",
  "shiki/wasm",
  "shiki/core",
  "shiki/engine/javascript",
  "shiki/themes/github-dark.mjs",
  "shiki/themes/github-light.mjs",
  "@shikijs/core",
  "@shikijs/engine-oniguruma",
  "@shikijs/engine-javascript",
  "@streamdown/code",
  "@streamdown/cjk",
  "@streamdown/math",
  "@streamdown/mermaid",
  "streamdown",
];

/** Vite plugin that stubs WASM/client-only packages during the SSR build only. */
function ssrStubPlugin(): Plugin {
  return {
    enforce: "pre",
    load(id) {
      if (id.startsWith(SSR_STUB_PREFIX)) {
        return "export default undefined;\nexport const cjk = undefined;\nexport const code = undefined;\nexport const math = undefined;\nexport const mermaid = undefined;\nexport const Streamdown = undefined;\nexport const createHighlighterCore = undefined;\nexport const createJavaScriptRegexEngine = undefined;\n";
      }
    },
    name: "ssr-stub",
    resolveId(source, _importer, options) {
      if (
        options.ssr &&
        ssrStubPackages.some(
          (pkg) => source === pkg || source.startsWith(`${pkg}/`)
        )
      ) {
        return SSR_STUB_PREFIX + source;
      }
    },
  };
}

/**
 * Patches CJS `__require("react")` calls in server output bundles.
 *
 * CJS packages like `use-sync-external-store` call `require("react")` at
 * runtime. Rolldown wraps this as `__require("react")` using createRequire,
 * which fails on Vercel serverless where react isn't in node_modules.
 *
 * Each chunk already has a bundled React function (e.g. `require_react` or
 * `require_react$1`). This plugin finds the correct name and rewrites the
 * CJS require to use the bundled version.
 */
function patchServerRequirePlugin(): Plugin {
  return {
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (
          chunk.type !== "chunk" ||
          !chunk.code.includes('__require("react")')
        ) {
          continue;
        }
        // Find the bundled React function name (require_react, require_react$1, etc.)
        const match = chunk.code.match(/\brequire_react(?:\$\d+)?\b/);
        if (match) {
          chunk.code = chunk.code.replaceAll(
            '__require("react")',
            `${match[0]}()`
          );
        }
      }
    },
    name: "patch-server-require",
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    ssrStubPlugin(),
    tanstackStart(),
    nitro({}),
    patchServerRequirePlugin(),
    viteReact(),
  ],
  preview: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3001,
  },
});

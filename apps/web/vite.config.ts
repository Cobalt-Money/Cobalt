import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

const SSR_STUB_PREFIX = "\0ssr-stub:";

/**
 * Packages that use WASM or are client-only (shiki syntax highlighting,
 * streamdown markdown streaming). These can't be bundled by Nitro's Rolldown
 * builder (WASM loading fails), so we stub them as empty modules on the server.
 * They only run inside `<ClientOnly>` on the client.
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

export default defineConfig({
  plugins: [
    tailwindcss(),
    ssrStubPlugin(),
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    nitro({}),
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

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    // SPA mode: ship a static HTML shell, hydrate client-side. No server
    // runtime — keeps deploy footprint identical to the prior Vite SPA build.
    // Prerender targets `/` so the landing route emits real HTML w/ meta
    // tags + JSON-LD for crawlers; every other route stays SPA-shell.
    tanstackStart({
      spa: { enabled: true },
      // Prerender wired in step 3 once `routes/index.tsx` has a synchronously
      // renderable landing markup (no maplibre/deck.gl during prerender — they
      // touch `window`/canvas at module load).
      // prerender: { routes: ["/"] },
    }),
    // React plugin MUST come after tanstackStart per Start docs.
    viteReact(),
  ],
  preview: {
    port: 3003,
  },
  server: {
    port: 3003,
  },
});

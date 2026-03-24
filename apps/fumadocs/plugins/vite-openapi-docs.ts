import { existsSync } from "node:fs";

import { generateFiles } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";
import type { Plugin } from "vite";

interface FumadocsOpenAPIOptions {
  /** Path to OpenAPI spec file(s) or URLs */
  input: string | string[];
  /** Output directory for generated MDX files */
  output: string;
  /** Grouping strategy: one page per tag, operation, or file */
  per?: "file" | "operation" | "tag";
}

export function fumadocsOpenAPI(options: FumadocsOpenAPIOptions): Plugin {
  const inputs = Array.isArray(options.input) ? options.input : [options.input];

  async function generate() {
    const localInputs = inputs.filter(
      (i) => i.startsWith("http") || existsSync(i)
    );
    if (localInputs.length === 0) {
      console.warn(
        "[fumadocs-openapi] No spec files found, skipping generation. Run extract-openapi first."
      );
      return;
    }
    const openapi = createOpenAPI({ input: localInputs });
    await generateFiles({
      input: openapi,
      output: options.output,
      per: options.per ?? "tag",
    });
  }

  return {
    name: "vite-plugin-fumadocs-openapi",
    async buildStart() {
      await generate();
    },
    configureServer(server) {
      for (const input of inputs) {
        if (!input.startsWith("http")) {
          server.watcher.add(input);
        }
      }
      server.watcher.on("change", async (file) => {
        const isSpec = inputs.some(
          (input) => file.endsWith(input) || file.includes(input)
        );
        if (isSpec) {
          await generate();
          server.ws.send({ type: "full-reload" });
        }
      });
    },
  };
}

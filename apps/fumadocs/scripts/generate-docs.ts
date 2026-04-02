import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { generateFiles } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env.local") });
config({ path: path.resolve(__dirname, "../.env") });

const { env } = await import("@cobalt-web/env/docs");

const openapi = createOpenAPI({
  input: [env.OPENAPI_URL],
});

await generateFiles({
  input: openapi,
  output: "./content/docs/api-reference",
  per: "operation",
  groupBy: "tag",
});

console.log("Generated API reference docs from:", env.OPENAPI_URL);

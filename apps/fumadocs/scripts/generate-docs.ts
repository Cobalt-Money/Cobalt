import { generateFiles } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";

const OPENAPI_URL =
  process.env.OPENAPI_URL ?? "http://localhost:3000/openapi.json";

const openapi = createOpenAPI({
  input: [OPENAPI_URL],
});

await generateFiles({
  input: openapi,
  output: "./content/docs/api-reference",
  per: "operation",
  groupBy: "tag",
});

console.log("Generated API reference docs from:", OPENAPI_URL);

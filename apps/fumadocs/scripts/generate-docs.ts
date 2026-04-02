import { generateFiles } from "fumadocs-openapi";

import { openapi, openapiInput } from "../src/lib/openapi";

await generateFiles({
  input: openapi,
  output: "./content/docs/api-reference",
  per: "operation",
  groupBy: "tag",
});

console.log("Generated API reference docs from:", openapiInput[0]);

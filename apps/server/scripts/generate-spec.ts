import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { v1 } from "../src/api/public/v1/index.js";

const spec = v1.getOpenAPI31Document({
  info: {
    description: "Cobalt public REST API. Stable, versioned, SDK-generated.",
    title: "Cobalt API",
    version: "1.0.0",
  },
  openapi: "3.1.0",
  security: [{ bearerAuth: [] }],
  servers: [{ url: "https://api.cobaltpf.com" }],
});

const out = join(import.meta.dirname, "..", "openapi.json");
writeFileSync(out, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`wrote ${out}`);

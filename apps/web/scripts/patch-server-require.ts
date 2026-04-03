/**
 * Patches Nitro server output to replace `__require("react")` with `require_react()`.
 *
 * CJS modules like `use-sync-external-store` call `require("react")` at runtime.
 * On Vercel serverless, react isn't in node_modules (it's bundled), so
 * `__require("react")` fails with ERR_MODULE_NOT_FOUND.
 *
 * The bundled React is already available as `require_react()` in the same file,
 * so we just replace the CJS require call with the bundled version.
 */
import fs from "node:fs";
import path from "node:path";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const ssrDir = path.resolve(scriptDir, "../.output/server/_ssr");

if (!fs.existsSync(ssrDir)) {
  console.log("[patch-server-require] No _ssr directory found, skipping.");
  process.exit(0);
}

let patched = 0;
for (const file of fs.readdirSync(ssrDir)) {
  if (!file.endsWith(".mjs")) {
    continue;
  }
  const filePath = path.join(ssrDir, file);
  const content = fs.readFileSync(filePath, "utf8");
  if (!content.includes('__require("react")')) {
    continue;
  }
  const updated = content.replaceAll('__require("react")', "require_react()");
  fs.writeFileSync(filePath, updated);
  patched += 1;
  console.log(`[patch-server-require] Patched ${file}`);
}

console.log(`[patch-server-require] Done. Patched ${patched} file(s).`);

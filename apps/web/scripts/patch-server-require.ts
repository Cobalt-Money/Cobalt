/**
 * Patches Nitro server output to replace `__require("react")` with `require_react()`.
 *
 * CJS modules like `use-sync-external-store` call `require("react")` at runtime.
 * On Vercel serverless, react isn't in node_modules (it's bundled), so
 * `__require("react")` fails with ERR_MODULE_NOT_FOUND.
 *
 * The bundled React is already available as `require_react()` in the same file,
 * so we just replace the CJS require call with the bundled version.
 *
 * Searches both `.output/` (local/default preset) and `.vercel/output/`
 * (Vercel preset) recursively for .mjs files to patch.
 */
import fs from "node:fs";
import path from "node:path";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const appDir = path.resolve(scriptDir, "..");

const searchDirs = [
  path.join(appDir, ".output"),
  path.join(appDir, ".vercel", "output"),
];

function findMjsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMjsFiles(fullPath));
    } else if (entry.name.endsWith(".mjs")) {
      results.push(fullPath);
    }
  }
  return results;
}

let patched = 0;
let searched = 0;

for (const dir of searchDirs) {
  if (!fs.existsSync(dir)) {
    console.log(`[patch-server-require] ${dir} not found, skipping.`);
    continue;
  }
  console.log(`[patch-server-require] Searching ${dir}...`);
  const files = findMjsFiles(dir);
  searched += files.length;
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    if (!content.includes('__require("react")')) {
      continue;
    }
    const updated = content.replaceAll('__require("react")', "require_react()");
    fs.writeFileSync(filePath, updated);
    patched += 1;
    const rel = path.relative(appDir, filePath);
    console.log(`[patch-server-require] Patched ${rel}`);
  }
}

console.log(
  `[patch-server-require] Done. Searched ${searched} .mjs files, patched ${patched}.`
);

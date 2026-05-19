// `useStorage` is Nitro's storage composable, not a React hook.
/* eslint-disable react-hooks/rules-of-hooks */
import { useStorage } from "nitro/storage";

const EXCLUDE = new Set(["index.ts", "relations.ts"]);

export function extractTableNames(content: string): string[] {
  const names: string[] = [];
  const regex = /pgTable\s*\(\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  m = regex.exec(content);
  while (m !== null) {
    if (m[1]) {
      names.push(m[1]);
    }
    m = regex.exec(content);
  }
  return names;
}

/**
 * Load all Drizzle schema .ts files from Nitro's `assets:db-schema` mount
 * (configured in nitro.config.ts serverAssets) into a virtual filesystem map
 * for bash-tool.
 */
export async function loadSchemaFiles(): Promise<Record<string, string>> {
  const storage = useStorage("assets:db-schema");
  const keys = await storage.getKeys();

  console.log("[schema-context] keys.length =", keys.length);

  if (keys.length === 0) {
    return { "README.md": "# Schema\n\nNo db schema assets found.\n" };
  }

  const out: Record<string, string> = {};
  const tableIndex: { file: string; tables: string[] }[] = [];

  for (const key of keys) {
    // unstorage keys use `:` as separator — convert back to path segments.
    const rel = key.replaceAll(":", "/");
    const basename = rel.split("/").pop() ?? rel;
    if (!rel.endsWith(".ts") || EXCLUDE.has(basename)) {
      continue;
    }
    const content = await storage.getItem<string>(key);
    if (typeof content !== "string") {
      continue;
    }
    out[rel] = content;
    const tables = extractTableNames(content);
    if (tables.length > 0) {
      tableIndex.push({ file: rel, tables });
    }
  }

  const readmeLines = [
    "# Database schema index",
    "",
    "Schema files are in this directory. Use `grep`, `cat`, or `ls` to explore.",
    "",
    "**SQL table names:** Use the exact names below in SQL queries (snake_case). Do NOT use JavaScript variable names.",
    "",
    "## Tables by file",
    "",
  ];
  for (const { file, tables } of tableIndex) {
    readmeLines.push(`### ${file}`);
    readmeLines.push("");
    readmeLines.push(`Tables: ${tables.join(", ")}`);
    readmeLines.push("");
  }
  out["README.md"] = readmeLines.join("\n");

  return out;
}

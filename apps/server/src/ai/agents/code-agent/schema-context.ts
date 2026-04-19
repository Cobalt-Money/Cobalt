import { schemaFiles } from "./schema-files.gen.js";

const EXCLUDE = new Set(["index.ts", "relations.ts"]);

function extractTableNames(content: string): string[] {
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

export function loadSchemaFiles(): Record<string, string> {
  const out: Record<string, string> = {};
  const tableIndex: { file: string; tables: string[] }[] = [];

  for (const [rel, content] of Object.entries(schemaFiles)) {
    const basename = rel.split("/").pop() ?? rel;
    if (!rel.endsWith(".ts") || EXCLUDE.has(basename)) {
      continue;
    }
    out[rel] = content;
    const tables = extractTableNames(content);
    if (tables.length > 0) {
      tableIndex.push({ file: rel, tables });
    }
  }

  if (Object.keys(out).length === 0) {
    return { "README.md": "# Schema\n\nNo db schema assets found.\n" };
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

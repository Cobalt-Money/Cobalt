// `useStorage` is Nitro's storage composable, not a React hook.
/* eslint-disable react-hooks/rules-of-hooks */
import { useStorage } from "nitro/storage";

export interface KnowledgeFile {
  description: string;
  filename: string;
  folder: string;
  id: string;
  keywords: string[];
  title: string;
}

function parseFrontmatter(content: string): {
  body: string;
  meta: Record<string, string>;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { body: content, meta: {} };
  }

  const meta: Record<string, string> = {};
  for (const line of (match[1] ?? "").split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return { body: match[2] ?? "", meta };
}

function keyToPath(key: string): string {
  return key.replaceAll(":", "/");
}

/**
 * List all knowledge .md file paths from Nitro's `assets:knowledge` mount
 * (configured in nitro.config.ts serverAssets).
 */
async function listKnowledgeEntries(): Promise<{ file: string; folder: string }[]> {
  const storage = useStorage("assets:knowledge");
  const keys = await storage.getKeys();
  const results: { file: string; folder: string }[] = [];

  for (const key of keys) {
    const file = keyToPath(key);
    if (!file.endsWith(".md")) {
      continue;
    }
    const segments = file.split("/");
    const basename = segments.at(-1) ?? file;
    if (basename === "README.md") {
      continue;
    }
    if (segments.includes("_tables") || segments.some((s) => s.startsWith("."))) {
      continue;
    }
    const folder = segments.length > 1 ? segments.slice(0, -1).join("/") : "root";
    results.push({ file, folder });
  }

  return results;
}

async function readAsset(file: string): Promise<string | null> {
  const storage = useStorage("assets:knowledge");
  const content = await storage.getItem<string>(file.replaceAll("/", ":"));
  return typeof content === "string" ? content : null;
}

export async function getKnowledgeRegistry(): Promise<KnowledgeFile[]> {
  const entries = await listKnowledgeEntries();
  const out: KnowledgeFile[] = [];
  for (const { file, folder } of entries) {
    const content = await readAsset(file);
    if (content === null) {
      continue;
    }
    const { meta } = parseFrontmatter(content);
    out.push({
      description: meta.description ?? "",
      filename: file,
      folder,
      id: meta.id ?? file.replace(/\.md$/, ""),
      keywords: (meta.keywords ?? "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      title: meta.title ?? file.replace(/\.md$/, ""),
    });
  }
  return out;
}

export async function getKnowledgeTOC(): Promise<string> {
  const registry = await getKnowledgeRegistry();
  const byFolder: Record<string, KnowledgeFile[]> = {};
  for (const entry of registry) {
    const f = entry.folder || "root";
    if (!byFolder[f]) {
      byFolder[f] = [];
    }
    byFolder[f].push(entry);
  }

  const lines: string[] = ["Available knowledge topics:"];
  for (const [folder, files] of Object.entries(byFolder)) {
    lines.push(`\n${folder}/`);
    for (const f of files) {
      lines.push(`  - ${f.id}: ${f.description || f.title}`);
    }
  }
  return lines.join("\n");
}

/** Load all knowledge .md files into a virtual filesystem map for bash-tool. */
export async function loadKnowledgeFiles(): Promise<Record<string, string>> {
  const entries = await listKnowledgeEntries();
  const out: Record<string, string> = {};

  for (const { file } of entries) {
    const content = await readAsset(file);
    if (content !== null) {
      out[file] = content;
    }
  }

  // Folder README.md files (glossaries)
  const folders = new Set(entries.map((f) => f.folder).filter((f) => f !== "root"));
  for (const folder of folders) {
    const readmePath = `${folder}/README.md`;
    const content = await readAsset(readmePath);
    if (content !== null) {
      out[readmePath] = content;
    }
  }

  // Main README index
  const registry = await getKnowledgeRegistry();
  const byFolder: Record<string, KnowledgeFile[]> = {};
  for (const entry of registry) {
    const f = entry.folder || "root";
    if (!byFolder[f]) {
      byFolder[f] = [];
    }
    byFolder[f].push(entry);
  }

  const readmeLines = [
    "# Financial Knowledge Base",
    "",
    "Expert-level reference files organized by topic.",
    "",
    "## Folder Structure",
    "",
  ];
  for (const folder of [...folders].toSorted()) {
    readmeLines.push(`### ${folder}/`);
    readmeLines.push(`See \`${folder}/README.md\` for glossary and file descriptions.`);
    readmeLines.push("");
    for (const entry of byFolder[folder] ?? []) {
      readmeLines.push(`- \`${entry.filename}\`: ${entry.description}`);
    }
    readmeLines.push("");
  }
  out["README.md"] = readmeLines.join("\n");

  return out;
}

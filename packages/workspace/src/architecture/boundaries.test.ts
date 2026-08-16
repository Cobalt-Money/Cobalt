import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const FORBIDDEN_IMPORTS = [
  "@cloudflare/",
  "cloudflare:",
  "drizzle-orm",
  "hono",
  "@cobalt-web/db",
  "@cobalt-web/ui",
] as const;

describe("package boundaries", () => {
  it("keeps provider and application dependencies outside production modules", async () => {
    const sourceDirectory = new URL("../", import.meta.url);
    const directoryEntries = await readdir(sourceDirectory, { recursive: true });
    const files = directoryEntries.filter(
      (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
    );
    for (const file of files) {
      const source = await readFile(new URL(file, sourceDirectory), "utf-8");
      for (const forbidden of FORBIDDEN_IMPORTS) {
        expect(source, `${file} imports ${forbidden}`).not.toContain(`from "${forbidden}`);
      }
    }
  });
});

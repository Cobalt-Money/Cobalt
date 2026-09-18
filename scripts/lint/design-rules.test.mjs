import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

for (const app of ["apps/web", "apps/friends"]) {
  test(`${app}: theme, shared component aliases, and all six rules work`, () => {
    const dir = mkdtempSync(path.join(root, app, "src/lint-probe-"));
    const lint = (source) => {
      const file = path.join(dir, "probe.tsx");
      writeFileSync(file, source);
      const result = spawnSync(
        path.resolve(root, "node_modules/.bin/oxlint"),
        ["--config", "oxlint.design.config.ts", "--format", "json", file],
        { cwd: root, encoding: "utf-8" },
      );
      assert.equal(result.error, undefined);
      assert.doesNotMatch(result.stderr, /could not be built/);
      return { status: result.status, diagnostics: JSON.parse(result.stdout).diagnostics };
    };
    try {
      writeFileSync(
        path.join(dir, "button.tsx"),
        'export { Button as Action } from "@cobalt-web/ui/components/button";',
      );
      const imports = `import { Action } from "@/${dir.split("/").at(-1)}/button";
        import { cn } from "@cobalt-web/ui/lib/utils";`;
      const valid = lint(`${imports}
        export const Probe = () => <div className="text-success bg-primary">
          <Action size="sm" className={cn("mt-4", "w-full")}>Save</Action>
        </div>;`);
      assert.equal(valid.status, 0, JSON.stringify(valid.diagnostics));
      assert.deepEqual(valid.diagnostics, []);

      const invalid = lint(`${imports}
        export const Probe = ({ classes }: { classes: string }) => <>
          <Action className="p-4">Save</Action>
          <div className={cn("p-[13px] bg-[#123456] text-pink-500 rounded-cobalt-does-not-exist")} style={{ marginTop: 5 }} />
          <Action className={classes}>Dynamic</Action>
        </>;`);
      assert.equal(invalid.status, 1);
      const codes = new Set(invalid.diagnostics.map(({ code }) => code));
      for (const rule of [
        "no-restyle",
        "no-arbitrary-values",
        "no-raw-colors",
        "no-inline-styles",
        "no-unknown-classes",
        "require-static-classes",
      ]) {
        assert.ok(
          codes.has(`shadcn(${rule})`),
          `Missing ${rule}: ${JSON.stringify(invalid.diagnostics)}`,
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

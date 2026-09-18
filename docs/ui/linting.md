# UI linting

The root toolchain uses Ultracite 7.12.0, Oxlint 1.83.0, Oxfmt 0.68.0,
and `@shadcn/lint` 0.1.1. Versions are pinned together in `package.json`.

## Commands

- `bun check`: lint integration tests, formatting, general lint, and workspace TypeScript checks.
- `bun fix`: ordinary lint fixes and formatting. It does not run the design audit.
- `bun run lint:design`: strict design audit of web, friends, and shared UI code.
- `bunx oxlint --config oxlint.design.config.ts apps/web/src/components/example.tsx`:
  audit a specific file.
- `bunx ultracite doctor`: verify toolchain compatibility and configuration.

The design audit is an adoption tool, not a required CI gate yet. It exits
nonzero when it finds violations. The initial audit found 1,720 diagnostics:
775 restyling, 540 arbitrary values, 201 raw colors, 194 inline styles, and
10 non-static class expressions. These are policy findings to review, not
proof that every existing style is a bug.

## Configuration

`oxlint.config.ts` registers the plugin and identifies shared primitives through
`@cobalt-web/ui/components`. The apps' existing `components.json` files supply
their theme paths. Registration alone does not enable shadcn rules in `bun check`.

`oxlint.design.config.ts` extends the native `ultracite/oxlint/shadcn` preset.
All six rules run as errors: `no-restyle`, `no-arbitrary-values`, `no-raw-colors`,
`no-inline-styles`, `no-unknown-classes`, and `require-static-classes`. The upstream layout allowance
is preserved. Existing root exclusions are also preserved, including generated
files, selected dynamic routes, and `packages/ui/src/components/**`.

The Milkdown CSS resolution problem is fixed with a version-pinned Bun patch
for wildcard package exports. `bun run test:lint` verifies the actual shared theme
and all six rules in both apps. Unknown-class exceptions are limited to verified
calendar selector hooks, an inline landing font class, and synthetic utility tests.

See [the diagnosis report](lint-diagnosis.md) and [baseline](lint-baseline.json)
for current counts, confirmed tooling issues, and prioritized follow-up work.

Customize component contracts in the design config before promoting policies
into the main config. For example, decide which Button appearance changes should
be variants and which overrides should be allowed. Do not mechanically remove
dynamic chart styles, brand colors, or component layout overrides just to pass.

The Ultracite upgrade also surfaced 993 general lint findings. Rules responsible
for existing debt temporarily run as warnings, with file-specific exceptions for
new findings from previously enabled rules. Promote each rule back to an error
when its findings have been reviewed and resolved. Other rules remain enforced.

`oxfmt.config.ts` replaces `.oxfmtrc.json` and extends the current Ultracite
formatter preset while retaining our previous formatting behavior and exclusions.

## Upstream documentation

- [shadcn lint rules](https://github.com/shadcn-ui/lint#rules)
- [Design-system contracts](https://github.com/shadcn-ui/lint/blob/main/docs/design-systems.md)
- [Ultracite release notes](https://www.ultracite.ai/changelog)

Ultracite now offers `ultracite upgrade` to update compatible toolchain versions
together. Review its dependency changes and run `bun check` after future upgrades.

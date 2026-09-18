# Lint diagnosis — 2026-09-18

This is the completed baseline/tooling tranche. Behavioral repairs and visual
design migration remain separate follow-up batches, described below.

## Outcome

The tooling now resolves our real Tailwind theme. All six design rules pass
positive/negative integration tests in web and friends, including `@/` aliases,
renamed re-exports of shared Buttons, `cn`, and theme tokens. The strict design
audit remains opt-in; no product UI was rewritten in this diagnosis batch.

## General baseline

993 diagnostics at 987 distinct file/line/column locations in 377 files. Multiple rules can flag the same code; these are not bug counts.

| Rule | Diagnostics | Locations | Files |
| --- | ---: | ---: | ---: |
| `react(function-component-definition)` | 515 | 515 | 272 |
| `eslint(no-await-in-loop)` | 113 | 113 | 47 |
| `react(no-unescaped-entities)` | 61 | 61 | 15 |
| `eslint(prefer-named-capture-group)` | 54 | 54 | 21 |
| `react(todo)` | 43 | 43 | 18 |
| `react(jsx-handler-names)` | 33 | 33 | 5 |
| `react(set-state-in-effect)` | 32 | 32 | 28 |
| `unicorn(prefer-number-coercion)` | 21 | 21 | 15 |
| `react(refs)` | 20 | 20 | 7 |
| `node(callback-return)` | 19 | 19 | 14 |
| `unicorn(import-style)` | 14 | 14 | 14 |
| `react(exhaustive-effect-dependencies)` | 9 | 9 | 9 |
| `unicorn(prefer-export-from)` | 9 | 6 | 6 |
| `eslint(no-void)` | 8 | 8 | 4 |
| `react(display-name)` | 7 | 7 | 5 |
| `react(memo-dependencies)` | 5 | 5 | 2 |
| `react(hook-use-state)` | 4 | 4 | 4 |
| `typescript(method-signature-style)` | 4 | 4 | 2 |
| `react(rule-suppression)` | 3 | 3 | 3 |
| `react(no-deriving-state-in-effects)` | 3 | 3 | 3 |
| `unicorn(prefer-single-call)` | 3 | 3 | 3 |
| `jsdoc(require-yields-description)` | 2 | 2 | 1 |
| `eslint(no-redeclare)` | 2 | 2 | 1 |
| `react(incompatible-library)` | 2 | 2 | 2 |
| `react(jsx-no-useless-fragment)` | 2 | 2 | 2 |
| `react(jsx-no-constructed-context-values)` | 1 | 1 | 1 |
| `react(iframe-missing-sandbox)` | 1 | 1 | 1 |
| `oxc(branches-sharing-code)` | 1 | 1 | 1 |
| `react(purity)` | 1 | 1 | 1 |
| `eslint(max-classes-per-file)` | 1 | 1 | 1 |

## Design baseline

1727 diagnostics at 1020 distinct file/line/column locations in 149 files. Multiple rules can flag the same code; these are not bug counts.

| Rule | Diagnostics | Locations | Files |
| --- | ---: | ---: | ---: |
| `shadcn(no-restyle)` | 775 | 322 | 95 |
| `shadcn(no-arbitrary-values)` | 540 | 400 | 52 |
| `shadcn(no-raw-colors)` | 201 | 139 | 37 |
| `shadcn(no-inline-styles)` | 194 | 186 | 40 |
| `shadcn(require-static-classes)` | 10 | 10 | 9 |
| `shadcn(no-unknown-classes)` | 7 | 3 | 3 |
## Tooling corrections

- `@shadcn/lint` 0.1.1 looked up exact CSS exports and physical paths but missed
  Milkdown's `./theme/common/*` export mapping. A version-pinned Bun patch adds
  Node resolution as a fallback for CSS subpaths. It preserves existing exact
  style-export handling and does not modify the application's CSS imports.
- The theme worker regression test failed with the original package and passes
  with the patch. The worker recognizes `text-success` and `bg-primary`, and
  rejects a fabricated utility. Remove the patch when an upstream version passes
  these tests unmodified; the test intentionally depends on this pinned worker API.
- Re-enabled `no-unknown-classes` in the audit. The actual theme initially produced
  12 findings. Five are confirmed intentional: two calendar selector markers,
  two synthetic strings in `cn` tests, and `font-display`, declared in the landing
  route's inline stylesheet. Exceptions are scoped to those exact files/classes.
- Corrected migration warnings to retain options for
  `react/function-component-definition` and `no-void`. A severity-only override
  reset those options: it reduced the component findings from 515 to 14 and
  increased void findings from 8 to 14. The corrected total is 993 warnings.

## Prioritized findings

| Priority | Evidence | Diagnosis and next action |
| --- | --- | --- |
| First | `apps/web/src/components/categories/category-form-dialog.tsx:72` includes `groups` in an effect that resets every draft field | `groups` is unused in the effect. A new groups identity can overwrite an in-progress draft. Candidate behavioral bug: reproduce with a rerender while typing, then remove that dependency if the test confirms the reset is unwanted. Also assess `initial` identity. |
| First | Render-time ref writes in `packages/ui/src/cobalt/transactions/transaction-notes-input.tsx:26`, `packages/color-thief/src/use-image-palette.ts:32,137`, and `apps/web/src/lib/transaction-undo.tsx:111` | Shared callbacks can observe values from an uncommitted render. Review committed-value semantics before moving writes into an effect; test updated limits/options and undo/redo callbacks. |
| First | `packages/ui/src/cobalt/transactions/selection-action-bar.tsx:36,38` reads/writes a previous-count ref during render | Ref is used as visible state for an exit animation. Test selecting, clearing, and reselecting during the 100ms exit before replacing it with an appropriate state lifecycle. |
| Next | `apps/web/src/components/brokerage/recent-activity-card.tsx:90` clamps pagination in an effect | Can render an empty out-of-range slice before the effect corrects it. Test shrinking and re-expanding data while on the last page; retain intended page-reset behavior when deriving a safe index. |
| Next | `apps/web/src/components/brokerage/recent-activity-card.tsx:111` contains bare `tracking` | Confirmed ungenerated utility. Remove it or choose the intended tracking token during a small visual cleanup. |
| Next | `apps/web/src/routes/privacy.tsx:27` and `terms.tsx:27` use `prose`, `prose-neutral`, and `dark:prose-invert` | The loaded shared theme generates none of these six occurrences. Decide whether typography plugin styling is intended, then verify both legal pages visually before installing it or replacing these classes. |
| Next | `text-destructive-foreground` in `apps/web/src/components/accounts/account-connection-actions.tsx:252` | No matching theme token exists. Review destructive-action foreground contrast in both themes; either declare the intended token or use a supported component variant. Do not substitute a random token to satisfy lint. |
| Low | `apps/web/src/routes/_auth/settings/route.tsx:54` calls `performance.now()` in a render debug log | Confirmed debug instrumentation, not business behavior. Remove the render/effect/cleanup logs together in the cleanup batch. |

These are source-reviewed diagnoses. Behavioral risks above have not been
reproduced in the running application yet; only the tooling fix has a failing-
then-passing regression test in this batch.

## Findings that must not be mechanically fixed

- **43 `react/todo` diagnostics are compiler implementation limitations**, such
  as unsupported `throw` inside `try/catch` and `finally` clauses. They are not
  developer TODO comments. Preserve error handling and cleanup semantics.
- Four extra memo-dependency findings in `use-bulk-actions.ts` occur alongside
  unsupported `finally` handling. Do not remove `onDone` solely on that advice:
  the callback is used in `finally` and must stay fresh.
- The two incompatible-library findings are `useReactTable` integration sites.
  Treat them as compiler optimization boundaries, not proof that tables are broken.
- Nine ref findings in `manage-categories-form.tsx` concern objects returned by
  `useSortable`. Inspect the library's returned values and compiler inference
  before treating the whole object as a React ref or moving its reads into effects.
- `transaction-notes-slash.tsx:149` intentionally resets selection when `items`
  changes. Removing that dependency would alter keyboard selection behavior.
- The iframe sandbox warning is in an account-connection **test mock**, with no
  iframe source. It is not evidence of an unsandboxed production embed.
- Polling loops require sequential `await`. Review each loop for ordering,
  throttling, and failure behavior before parallelizing independent work.
- Function declaration style accounts for 515 warnings alone. Repository
  conventions permit function components; choose a convention explicitly instead
  of treating arrows as a correctness improvement.

## Design policy proposal and pilot

746 pre-exception design findings come from landing components, many recreating
third-party product surfaces. Review these separately from authenticated product
UI; raw brand colors and tight dimensions can be intentional. Do not exempt the
whole landing directory without reviewing the actual requirements.

Pilot transaction tags with these proposed contracts:

1. Keep shared primitives responsible for appearance. Extract the repeated tag
   trigger appearance into a domain component before adding a generic Button
   variant used by only one feature. Keep margin/width/placement caller-owned.
2. Preserve the `TagColor` palette and translucent tag backgrounds. The existing
   colors are palette selections, not arbitrary user-entered hex values. Permit
   dynamic color properties narrowly or use CSS variables without changing output.
3. Review `text-[13px]` against the intended design; either keep a documented
   domain token or deliberately standardize on a supported size after visual review.
4. Shared wrappers may forward `className`. Decide whether to inspect callers or
   grant a narrow exception; do not remove a useful customization API just because
   the static analyzer cannot follow it.

Pilot acceptance: tag creation, selection, removal, keyboard focus, light/dark
states, and dense table layout behave as before; reviewed contracts pass the audit.
Only then add a required gate for that feature and expand to adjacent features.
No new feature-level gate was enabled in this diagnosis batch.

## Coverage and reproducibility

The audit includes `apps/web`, `apps/friends`, and `packages/ui`, subject to root
ignore patterns and Git ignores. It excludes the shared primitive implementation
folder `packages/ui/src/components/**` and web dynamic routes matching
`apps/web/src/routes/**/$*.tsx`. Docs, Raycast, and Fumadocs are outside this audit.
Files ignored by these patterns are unassessed, not clean. General lint scans
`apps` and `packages` with its existing exclusions. Neither command covers root
scripts/configs automatically; lint those explicitly when changing them.

The summary snapshot is `docs/ui/lint-baseline.json`. Reproduce full diagnostics:

```sh
bunx oxlint apps packages --format json > /tmp/cobalt-general.json
bun run lint:design --format json > /tmp/cobalt-design.json
bun run test:lint
bun check
```

The design command is expected to exit 1 while known policy debt remains. A config
load error or theme fallback warning is not a valid baseline. Compare diagnostics
by rule, path, and location; output ordering is not stable across lint workers.

For the next batch, start with the draft-reset reproduction and committed-ref
behavior tests. Keep each fix separate from design/style changes. Require tests
for changed behavior and visual review for changed appearance, then promote only
reviewed rules/areas to blocking errors. A global zero-warning gate is premature.

## Follow-up: verified fixes

A subsequent focused fix batch addressed five report items without adding rule
suppressions:

- Category drafts survive refreshed group arrays and equivalent initial-value
  objects. Reopening still resets the draft. Regression test reproduced the loss
  before the dependency fix.
- Activity pagination corrects an out-of-range page before DOM commit when data
  shrinks and retains the corrected page when data grows again. A React Profiler
  regression test caught the previous empty-page commit. Removed bare `tracking`.
- Selection exit labels retain the last committed count even after a suspended,
  abandoned render. Replaced render-time ref mutation with guarded state updates.
  Tests cover abandoned renders, exit timing, and reselection during exit.
- The disconnect confirmation uses the existing destructive Button variant,
  removing its undeclared foreground token and redundant appearance overrides.
- Removed settings render/effect/cleanup debug logging.

Four new regression tests and the existing account-reconnect test pass. The
working-tree audit now reports 988 general warnings and 1,722 design findings;
`lint-baseline.json` remains the original diagnosis snapshot for comparison.
The remaining ref/editor integration work and typography decisions are still open.
React Doctor fell back to a full scan despite the requested diff scope; its broad
findings are not a clean changed-files verdict. No browser visual pass was performed
for this batch; the destructive action now follows the shared component styling.

# Project Scope

What contributions we will and won't accept. Read before opening a PR
for anything beyond a small fix.

## In scope

- **Bug fixes** in any workspace package, with a repro.
- **Security findings** — see [`../../SECURITY.md`](../../SECURITY.md)
  for the private disclosure path. Do not open public issues.
- **Accessibility, UX polish, copy fixes** for the hosted product.
- **Test coverage** for existing behavior. New tests should match the
  style of nearby tests (Bun + Vitest).
- **Performance improvements** with a reproducible benchmark.
- **Documentation fixes** for the fumadocs site and existing READMEs.
- **Type-safety improvements** — strictness wins, narrower types over
  `any` / `unknown` casts.

## Out of scope

- **Self-hosting setup, deployment guides, Docker Compose for the
  whole app.** Self-hosting is not officially supported. See the
  README for context. PRs adding setup tutorials, one-command
  deploy scripts, or seed data will be closed.
- **Alternative providers.** We use Plaid, SnapTrade, Stripe, Better
  Auth, Rocicorp Zero, AI Gateway. PRs to add adapters for competing
  services (Teller, MX, Auth0, Clerk, Convex, etc.) will be closed —
  every adapter is permanent maintenance debt.
- **Alternative databases or ORMs.** Postgres + Drizzle is fixed. No
  MySQL / SQLite / Prisma / Kysely ports.
- **Alternative bundlers / runtimes.** Bun + Vite + Hono is fixed.
  No Node-only forks, no Webpack/Next.js migration.
- **Feature flags for theoretical use cases.** New configuration
  switches must be justified by a real user need in the hosted
  product.
- **Speculative refactors** that don't fix a bug or unblock a feature.
- **License changes** to MIT/Apache/permissive. AGPL-3.0 is the
  intentional choice (see FAQ). Not under review.
- **Self-host adapter PRs masquerading as features.** "Add a config
  flag to skip Plaid" or "Make Better Auth optional" effectively
  enable self-hosting and will be closed.

## Linting and formatting

- **Ultracite** (Oxlint + Oxfmt) is the only linter/formatter.
- Run `bun fix` before submitting.
- Do not introduce ESLint, Prettier, Biome, or other tooling.

## Tests

- Required for bug fixes (write the failing test first).
- Required for new behavior in `apps/server`, `packages/server-data`,
  `packages/zero`.
- Vitest fixtures use synthetic data only. No real PII in tests.

## Database migrations

- We do not run drizzle-kit commands on your behalf. Migrations are
  authored manually and reviewed for safety.
- Drop + re-add of the same column with a different type must be
  split across two migrations.
- Data backfills are always hand-written, never auto-generated.

## Process

1. Open an issue first for anything non-trivial. We may decline
   features that conflict with the product direction.
2. One change per PR. Keep PRs focused.
3. Sign every commit with `git commit -s` (DCO required —
   see [`../../RELICENSING.md`](../../RELICENSING.md)).
4. Expect review turnaround in days, not hours. Solo maintainer.

## When in doubt

If you're not sure whether your change is in scope, open an issue with
a one-paragraph description and a link to the file(s) you intend to
touch. We will say yes, no, or "this needs design" before you spend
time on it.

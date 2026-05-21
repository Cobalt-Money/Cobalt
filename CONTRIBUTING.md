# Contributing to Cobalt-Web

Thanks for your interest in Cobalt-Web. Read this file before opening a PR.

## Posture

This repository is **source-available for transparency**, not a self-host
distribution. Cobalt is a hosted product; the public repository exists so
users and security researchers can audit how the app handles financial data.

- Bug reports and PRs against the hosted product are welcome.
- **Self-hosting questions, setup tutorials, and "how do I deploy this myself"
  issues will be closed as not planned.** See the README for context.

## Scope

Read [`docs/oss/SCOPE.md`](./docs/oss/SCOPE.md) before starting any
non-trivial work. It lists what we accept (bugs, security, UX, tests,
performance, docs) and what we don't (self-host setup, alt providers,
alt DBs, license changes).

## Before you open a PR

1. **Sign your commits (DCO).** Every commit in your PR must include a
   `Signed-off-by:` trailer. Commit with `git commit -s` to add it
   automatically. A DCO check runs on every PR and blocks merge if any
   commit is unsigned. See [`RELICENSING.md`](./RELICENSING.md) for the
   full text of what you certify and how to fix an unsigned PR.
2. **Open an issue first** for anything beyond a small fix. We may decline
   features that conflict with the product direction — checking first saves
   you time.
3. **Keep PRs focused.** One change per PR. Include rationale in the
   description.

## Code style

- TypeScript across the repo. Use the existing patterns in the surrounding
  files — do not introduce new tooling without discussion.
- Linting / formatting: [Ultracite](https://www.ultracite.ai/) (see
  `oxlint.config.ts`, `oxfmt.config.ts`). Run formatters before committing.
- Tests: add or update tests for non-trivial changes. Match the existing
  test style in the affected package.

## Security

Do **not** open public issues for vulnerabilities. See
[`SECURITY.md`](./SECURITY.md) for the private disclosure path.

## License

By submitting a contribution with a DCO sign-off, you certify under the
terms of the [Developer Certificate of Origin v1.1](https://developercertificate.org/)
that you have the right to contribute the work and agree to license it
under [AGPL-3.0](./LICENSE). See [`RELICENSING.md`](./RELICENSING.md).

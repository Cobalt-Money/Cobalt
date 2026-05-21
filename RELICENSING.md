# Relicensing & Contribution Terms

All commits in this repository prior to the public open-source release were
authored by Sriket Komali, who holds the copyright. The project is licensed
under the GNU Affero General Public License v3.0 (AGPL-3.0-only) going
forward — see [`LICENSE`](./LICENSE).

## Contributions and the Developer Certificate of Origin (DCO)

External contributions are governed by the
[Developer Certificate of Origin (DCO) v1.1](https://developercertificate.org/).
Every commit in a pull request must include a `Signed-off-by:` trailer
certifying the contributor's right to submit the work. The DCO is a public
attestation — not a copyright assignment. Contributors retain copyright on
their own commits.

### How to sign off

Add the `-s` flag when committing:

```bash
git commit -s -m "your message"
```

This appends a trailer of the form:

```
Signed-off-by: Your Name <you@example.com>
```

The name and email must match the commit author. Anonymous, pseudonymous,
or noreply-only sign-offs are not accepted.

### What you are certifying

By signing off, you certify the four DCO clauses (see
<https://developercertificate.org/>): you wrote the contribution or have
the right to submit it under AGPL-3.0, you understand the contribution is
public, and you accept that records of the contribution (including your
sign-off) will be maintained indefinitely.

### Enforcement

A DCO check runs on every pull request. PRs with unsigned commits cannot
be merged. To fix an unsigned PR, rebase with `git rebase --signoff main`
and force-push the branch.

## Copyright and relicensing

All contributions are licensed under AGPL-3.0 as part of the combined
work. The DCO does not grant the project the right to relicense external
contributions under a different license (including a future commercial
license). If commercial dual-licensing is pursued later, separate
consent will be sought from each contributor, or the relevant code will
be rewritten.

## Third-party code

Third-party code included in this repository remains under its original
license. See dependency manifests (`package.json`, `bun.lock`) for the
complete set.

## Raycast extension carve-out (`apps/raycast/`)

The Raycast extension under [`apps/raycast/`](./apps/raycast/) is
distributed under the **MIT License**, not AGPL-3.0. This is required
by the Raycast Store, which mandates MIT for all published extensions
(see `developers.raycast.com/basics/prepare-an-extension-for-store`).

The carve-out is legally clean because:

- `apps/raycast/` does not import any AGPL-licensed workspace package
  (no `@cobalt-web/*` or `workspace:` dependencies).
- It depends only on `@raycast/api` and `@raycast/utils`.
- It communicates with the Cobalt API over the network via OAuth2 — a
  separate process boundary, not a linked derivative work.

Same legal pattern as the MIT-licensed Plaid Node SDK being used by
AGPL'd applications.

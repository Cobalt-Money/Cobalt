# Open-Source FAQ

Day-1 answers for predictable launch questions. Living document — update as
new questions come in.

## Why is the source available?

Cobalt handles sensitive financial data (bank account links via Plaid,
balances, transactions). Publishing the source means users, security
researchers, and journalists can audit exactly how the app works without
trusting our marketing copy.

This follows the model used by Signal, Proton, Tailscale, and early
Bitwarden: the code is public, but the hosted product is the supported
way to use it.

## Why AGPL-3.0 instead of MIT or Apache?

Three reasons:

1. **Anti-rehost moat.** AGPL plus the absence of a self-host path makes
   it hard for hyperscalers or copycats to spin up a competing service
   on our code. AGPL's network-use clause requires anyone running a
   modified version as a network service to release their changes.
2. **AI discoverability.** Open-source code ends up in training data, RAG
   indexes, and AI coding assistants. AGPL still gets us that reach.
3. **Trust.** For a finance app, AGPL signals "we want you to be able
   to verify this," not "take it and ship a fork."

## Can I self-host Cobalt?

**Self-hosting is not officially supported.** The code is fully functional
and a motivated person with their own Plaid credentials, database, and
infrastructure can run it. We will not:

- Write a setup tutorial.
- Ship seed data.
- Maintain Plaid / database / Vercel / Railway setup docs.
- Triage "how do I run this myself" issues.

The hosted product is the canonical way to use Cobalt.

## Can I use this commercially?

AGPL-3.0 governs your rights. The headline constraints:

- You can run Cobalt for personal or internal use.
- If you offer Cobalt (or a modified version) as a network service, you
  must release your modifications under AGPL-3.0 to your users.
- You cannot relicense the code under a different license.

For a commercial license that lifts the AGPL obligations, contact
**licensing@cobalt.app** (replace before launch).

## Is my financial data private?

The hosted Cobalt product is the only deployment we operate. We do not
sell user data. Plaid handles bank credential exchange — Cobalt never
sees raw bank passwords. See our privacy policy for the full statement.

The source being public means anyone can verify how data is handled at
the code level.

## Will you accept contributions?

Yes, with caveats:

- A DCO sign-off is required on every commit before any external
  contribution can be merged. Commit with `git commit -s`. See
  `RELICENSING.md`.
- Open an issue before any non-trivial PR.
- Self-hosting setup contributions will not be merged.

## Why was Maybe Finance / Firefly III not enough?

Maybe Finance was archived in 2025. Firefly III is great but takes a
different architectural approach. Cobalt prioritizes a polished hosted
experience over self-host ergonomics.

## Where do I report security issues?

`SECURITY.md`. Do not open a public GitHub issue.

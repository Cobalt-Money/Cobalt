# Permissions, side effects, and async work

## Permissions

Mutators are **normal server-side TypeScript**. There is no separate Zero permission DSL: use **`ctx`**, `tx.run` checks, membership tables, role columns, etc., the same way you would in any API handler.

Keep **client mutators** optimistic but **cheap**; put **authoritative** checks on the **server** path (override mutator or `tx.location === "server"` branch).

Official **Auth → Permissions** page ties this to queries and context.

## Impure mutators

Calling **external HTTP** or **non-deterministic** services **inside** the mutator is allowed but risky:

- Long-running network calls **inside** a DB transaction **hurt** throughput and can deadlock.
- Retries may **re-run** server mutators; external side effects must be **idempotent** or keyed.

## Transactional outbox (recommended for notifications)

For **email**, **webhooks**, **push notifications**, use a **transactional outbox**:

1. In the same mutator transaction, **`insert` an `outbox` row** describing the work.
2. A **background worker** polls the outbox, sends messages, marks rows processed.

That pattern survives crashes and avoids holding DB transactions open while talking to SendGrid.

## `createMutators` injection pattern

For **early prototypes**, the docs show building the server registry with a **factory** that accepts an array of **`asyncTasks`**, pushing work like `sendEmail` after `tx.mutate` succeeds. This is explicitly **quick and dirty** compared to outbox—migrate before production scale.

## Related chapters

- [authentication.md](../authentication.md) — `ctx` and query alignment
- [server-push.md](server-push.md) — server-only branches and raw SQL
- [reading/running-preloading.md](../reading/running-preloading.md) — data visible to client mutators

## Package reference

**`out/zero-schema/src/permissions.ts`** — permission helpers used with schema. Mutator / transaction surfaces: **`out/zql/src/mutate/`**. Server-only enforcement paths: **`out/zero-server/src/`**.

## Further reading (official)

- [Permissions](https://zero.rocicorp.dev/docs/auth#permissions)
- [Notifications and async work](https://zero.rocicorp.dev/docs/mutators#notifications-and-async-work)

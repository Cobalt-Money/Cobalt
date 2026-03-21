# Defining mutators

Mutators are created with **`defineMutator`** and registered once in a top-level **`defineMutators`** call. The **`MutatorFn` is always `async`**.

## Minimal mutator

```ts
import { defineMutator } from "@rocicorp/zero";

const myMutator = defineMutator(async ({ tx }) => {
  // use tx.mutate / tx.run
});
```

## Writing with `tx.mutate`

Each table in your Zero schema has a field on **`tx.mutate`**. The API is **CRUD-shaped**:

### `insert`

Creates a row. Supply a full primary key (prefer **client-generated** ids — see [running-results.md](running-results.md)).

### `upsert`

Insert or update by primary key. Same **`null` / `undefined`** semantics as `insert` for optional columns:

- **`null`** — explicitly set the column to SQL `NULL`.
- **`undefined` / omit** — leave unchanged on update, or use the **server default** on insert (could be `NULL` or a generated default).

### `update`

Partial update by primary key. **No-op** if the row does not exist.

- Omitted fields stay unchanged.
- **`undefined`** on a field means “do not change” (same as omit for that field).
- **`null`** sets the column to `NULL`.

### `delete`

Deletes by primary key. **No-op** if the row does not exist.

### Always `await` writes

**Await every** `tx.mutate.*` call. Missing `await` lets the transaction logic commit or continue in the wrong order and causes **runtime errors** when later steps expect prior writes to have finished.

## Arguments and validators

Pass a **validator** first (Zod or any **Standard Schema**), then the async function receiving **`{ tx, args }`** (and **`ctx`** when you use context):

```ts
const updateIssue = defineMutator(
  z.object({ id: z.string(), title: z.string() }),
  async ({ tx, args: { id, title } }) => {
    if (title.length > 100) {
      throw new Error("Title is too long");
    }
    await tx.mutate.issue.update({ id, title });
  }
);
```

Args are **untrusted on the server** (they originate from the client). Validate **shape and bounds** before touching the database.

## Reading inside a mutator — `tx.run` + ZQL

Use **`tx.run(zql...)`** to read. Full ZQL power applies: filters, relationships, `one()`, etc. Concept guide: [zql/overview.md](../zql/overview.md).

**Transactional guarantee:** Reads and writes in one mutator see a **consistent snapshot**. If the mutator **throws**, the whole mutation **rolls back**.

### Client vs server reads

- **`tx.location === "client"`** — `tx.run` only sees data **already in the local cache** (like optimistic reads). There is **no** option to “wait for server” inside a mutator; that would defeat optimistic UX.
- **`tx.location === "server"`** — `tx.run` sees **full** datastore state for that server transaction.

So: client mutators **cannot** block on authoritative reads; design flows that work with **cached** rows or defer strict checks to the **server** run.

## Context (`ctx`) vs args

**Args** are client-supplied. **Never** put secrets or trusted identity only in args.

**`ctx`** is attached on the **server** when handling the mutate request (user id, org id, …). Use it to enforce **ownership** and **tenancy** (for example set `authorID` from `ctx.userID`).

See [authentication.md](../authentication.md) and the official **Context** section under Auth.

## Purity

Mutators are **usually** pure functions of **`tx` state + args + ctx**. They **may** be impure on the **server** (call external services for validation). Keep side effects that must **exactly once** succeed inside **transactions + outbox** patterns — [permissions-async.md](permissions-async.md).

## `defineMutators` — registry

```ts
export const mutators = defineMutators({
  issue: {
    update: defineMutator(
      z.object({ id: z.string(), title: z.string() }),
      async ({ tx, args }) => {
        await tx.mutate.issue.update(args);
      }
    ),
  },
});
```

**Use `defineMutators` only once at the top level** of your central `mutators.ts` (same rule as `defineQueries`). It computes **`mutatorName`** strings such as `issue.update` sent on the wire.

Nest arbitrarily (`posts.create`, `users.updateRole`, …). Split across files by exporting objects and merging in the root `defineMutators({ posts: postMutators, ... })`.

## Callable mutators

Each registry leaf is a **callable** you pass to `zero.mutate`:

```ts
zero.mutate(
  mutators.issue.update({
    id: "issue-123",
    title: "New title",
  })
);
```

Each exposes **`mutatorName`** for debugging.

## Registration on the Zero client

Mutators must be **registered** with the **`Zero` constructor** (same registry object). If you invoke a mutator that was **not** registered, Zero **throws** — this matters for **sync** and **conflict** handling, not only for direct calls.

## Package reference

**`out/zql/src/mutate/`** — `defineMutator`, `defineMutators`, transaction and `tx.mutate` APIs. **`out/zero-client/src/client/`** — wiring mutators into the `Zero` instance.

## Further reading (official)

- [Defining mutators](https://zero.rocicorp.dev/docs/mutators#defining-mutators)
- [Reading data inside mutators](https://zero.rocicorp.dev/docs/mutators#reading-data)
- [Context](https://zero.rocicorp.dev/docs/auth#context)

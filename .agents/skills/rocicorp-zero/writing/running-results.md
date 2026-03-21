# Running mutators and waiting for results

## Invoking — `zero.mutate`

```ts
import { nanoid } from "nanoid";

zero.mutate(
  mutators.issue.update({
    id: nanoid(),
    title: "New title",
  })
);
```

**Client-generated IDs** (nanoid, ulid, uuid v7, …) work best with sync: the client and server agree on the primary key **before** any round trip. Avoid patterns where only the server knows the new id after insert unless you have a deliberate reconciliation story.

## Fire-and-forget (default recommendation)

Optimistic UI assumes mutations **usually succeed**. If failures are common, optimistic updates feel wrong—consider **pessimistic** UX for those flows or stronger validation before calling `mutate`.

Most handlers **do not await** the server; the UI reacts to **query updates** and **error callbacks** instead.

## `.client` and `.server` promises

`zero.mutate(...)` returns a handle with:

- **`.client`** — resolves when the **client-side** mutator + local persistence (IndexedDB) finish. Still **sub-frame** in typical cases, but **not** synchronous: a **`zero.run` immediately after** `mutate` may **not** see the new row until you **`await write.client`**.
- **`.server`** — resolves when the **server** has applied the mutation (network round trip). If the **client** mutator fails, **`.server`** rejects with the **same** error—you often only need to await **one** of the two.

### Read-after-write on the client

```ts
const write = zero.mutate(mutators.issue.insert({ id, title }));

const read1 = await zero.run(queries.issue.byId(id));
// May be empty — local write not flushed yet.

await write.client;

const read2 = await zero.run(queries.issue.byId(id));
// Local store should include the row now.
```

### Waiting for server confirmation

Await **`.server`** when you need **Postgres** truth (for example before navigating to a server-only permission gate). Remember: even after server success, a **`zero.run` without `{ type: 'complete' }`** may still behave like partial local reads—see [reading/partial-results.md](../reading/partial-results.md).

### Errors

Inspect **`res.type === 'error'`** on client/server result objects to branch UI. Thrown mutators on the server are converted to structured errors per **`handleMutateRequest`**.

## No return values (today)

There is **no** first-class “return payload from mutator success” in the current model. If you need created metadata, **read it back** with a query after the write settles, or extend your schema with predictable ids.

## Package reference

**`out/zero-client/src/client/`** — `mutate` return type (`.client` / `.server` promises). Server error mapping: **`out/zero-server/src/`** next to `handleMutateRequest`.

## Further reading (official)

- [Running mutators](https://zero.rocicorp.dev/docs/mutators#running-mutators)
- [Waiting for results](https://zero.rocicorp.dev/docs/mutators#waiting-for-results)
- [IDs (Postgres support)](https://zero.rocicorp.dev/docs/postgres-support#ids)

# Defining queries

Named queries are built from **`defineQuery`** and registered in a single top-level **`defineQueries`** call. Together they form a **query registry** the Zero client and your server both use.

## `defineQuery` — the query function

A query definition wraps a **function that returns ZQL** (via your schema’s `zql` export).

**Minimal form** — no arguments:

```ts
const allPosts = defineQuery(() => zql.post);
```

**With arguments** — pass a **validator** first, then a function that receives `{ args }` (and optionally `ctx`):

```ts
const postsByAuthor = defineQuery(
  z.object({ authorID: z.string().optional() }),
  ({ args: { authorID } }) => {
    let q = zql.post;
    if (authorID !== undefined) {
      q = q.where("authorID", authorID);
    }
    return q;
  }
);
```

Examples in the official docs use **Zod**, but any library that implements **Standard Schema** works. Validators matter because **the same query runs on the client and on the server**; on the server, **args arrive from the client and are untrusted** — the validator is your first gate before those values touch ZQL.

## `defineQueries` — the registry

`defineQuery` alone only produces a **definition**. You **register** definitions with **`defineQueries`**:

```ts
export const queries = defineQueries({
  posts: {
    all: defineQuery(() => zql.post),
    byAuthor: postsByAuthor,
  },
});
```

The return value is a **query registry**. Each registered entry becomes a **callable `Query`** you pass to `useQuery`, `run`, `preload`, etc.

**Important:** Call **`defineQueries` once at the top level** of your central registry file (for example `queries.ts`). It computes each query’s **stable `queryName`** from the object path (for example `posts.all`). Multiple top-level `defineQueries` calls would fragment naming.

## Query names

Every callable query exposes **`queryName`** — a string like `posts.all`. That string is what the client sends to `zero-cache` and what your server uses to **look up** the right implementation. Treat it as part of your **wire protocol**.

## Nesting and file layout

You can nest arbitrarily deep under `defineQueries` to mirror product domains (`issues`, `comments`, `users`, …). Large apps often split definitions across modules:

```ts
// posts.ts
export const postQueries = { get: defineQuery(/* ... */) };

// queries.ts
import { postQueries } from "./posts.ts";
export const queries = defineQueries({ posts: postQueries });
```

Only the **final** `defineQueries({ ... })` should be at module scope for the whole app’s name map.

## Context (`ctx`) — not the same as args

**Args** are chosen by the client and forwarded to the server — they must **never** carry secrets or identity you trust blindly.

**Context** is **`ctx`** in the query function: values your **server** attaches when resolving the query (user id, org id, roles). The user **cannot** forge `ctx` from the browser the way they can tamper with args. Use `ctx` to **scope** ZQL safely:

```ts
const myPosts = defineQuery(({ ctx: { userID } }) =>
  zql.post.where("authorID", userID)
);
```

How `ctx` is populated ties directly to auth — see [authentication.md](../authentication.md).

## Convention: central `queries.ts`

Keep **all** application queries discoverable from one registry (or one barrel that re-exports nested modules). That file is imported **both** where you construct the Zero client **and** where you implement the **query HTTP endpoint** on the server, so names and implementations cannot drift.

## ZQL reference in this skill

For **`where`**, **`related`**, **`orderBy`**, and server execution, see [zql/overview.md](../zql/overview.md) and the rest of the **zql/** folder.

## Package reference

**`out/zql/src/query/`** — `defineQuery`, `defineQueries`, query registry, named-query types (open **`*.d.ts`** in that tree).

## Further reading (official)

- [Defining queries](https://zero.rocicorp.dev/docs/queries#defining-queries)
- [Context](https://zero.rocicorp.dev/docs/auth#context)

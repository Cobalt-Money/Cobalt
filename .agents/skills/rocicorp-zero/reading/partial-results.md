# Partial data, completeness, and errors

Zero deliberately returns **local** results **before** the server responds. That makes UI fast but requires you to understand **what you know** vs **what is still loading**.

## `complete` vs `unknown`

Reactive APIs expose a **`result`** object alongside row data. **`result.type`** is currently either:

- **`unknown`** — you are seeing **only what the client already had** locally; the server may still add or correct rows.
- **`complete`** — the **server result** for this query has been applied (today this is the main signal; future Zero versions may refine when `complete` can be inferred purely locally).

Use this distinction whenever “empty” might mean **“still loading”** vs **“truly empty.”**

## “Not found” / 404 without flicker

If you branch on “no row” **too early**, users see a **404 flash** and then real data once the server fills in.

**Rule:** Only show definitive **not found** UI when **`result.type === 'complete'`** and the collection is still empty. While type is `unknown`, prefer **skeletons** or **neutral loading** states.

The same idea applies to detail pages keyed by id: wait for **`complete`** before concluding the record does not exist.

## Query application errors vs connection errors

When the **query endpoint** returns an **application or parse** error, the client receives **`type`** and **`error`** information on the query details object (per official docs).

**HTTP / network** failures talking to the endpoint are **not** the same surface — they flow through **connection status** APIs. Debug “silent stall” vs “red error” accordingly: [connection.md](../connection.md).

## Immutability (reminder)

Regardless of `result.type`, treat hook outputs as **immutable**. Derive sorted or filtered views with copies — see [overview.md](overview.md) and [react.md](../react.md).

## Package reference

**`out/zero-client/src/types/`** (or **`out/zql/src/query/`**) — `complete` / `unknown` result shapes and query-detail error types; exact module names vary—grep **`QueryResult`** / **`complete`** in **`out/zero-client/`** and **`out/zql/`**.

## Further reading (official)

- [Missing data](https://zero.rocicorp.dev/docs/queries#missing-data)
- [Partial data](https://zero.rocicorp.dev/docs/queries#partial-data)
- [Handling errors](https://zero.rocicorp.dev/docs/queries#handling-errors)
- [Connection status](https://zero.rocicorp.dev/docs/connection)

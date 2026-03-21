# REST alongside Zero

Zero optimizes **interactive clients** that hold a sync connection. Many products still need **REST** (or GraphQL) for:

- **Webhooks** from third parties hitting your backend directly.
- **Mobile or embedded** clients not yet on Zero.
- **Public APIs** for partners.
- **Gradual migration** from CRUD to sync.

## Architectural rule

REST handlers talk to **Postgres** (or domain services) but must enforce the **same authorization model** as:

- **`ZERO_QUERY_URL`** (reads)
- **`ZERO_MUTATE_URL`** (writes)

If REST can read a row the sync layer cannot, you have a **security bug**. If REST writes data Zero clients never see, you have a **consistency bug** until replication catches up—usually acceptable if you design for it.

## Prefer mutator-shaped writes internally

Even inside REST, structure writes similarly to **mutators**: validate input, check permissions, perform a **transaction**, emit **domain events** if needed.

## Idempotency

REST `POST` endpoints that create rows should accept a **client-supplied idempotency key** or natural key so retries do not duplicate data—same reasoning as [writing/running-results.md](writing/running-results.md).

## When not to add REST

If every consumer can run the Zero client, duplicating business logic in REST increases drift. Sometimes a thin **admin-only REST** for backoffice is still worth it—document the split clearly.

## Related chapters

- [authentication.md](authentication.md) — shared authz rules
- [deployment.md](deployment.md) — colocating routes on the API server

## Package reference

REST is **your** API server. Zero’s own HTTP surface for queries/mutations lives in **`out/zero-server/src/`** (`handleMutateRequest`, query pipeline—match names in **`*.d.ts`** for your version).

## Further reading (official)

- [REST APIs for Zero applications](https://zero.rocicorp.dev/docs/rest)

# `@cobalt-web/workspace`

Provider-independent workspace contracts for Cobalt. This package owns the domain model and does not import Cloudflare, R2, Drizzle, Hono, or application code.

## Entry points

- `@cobalt-web/workspace/runtime` — `WorkspaceRuntime` command, lifecycle, and filesystem service.
- `@cobalt-web/workspace/metadata` — `WorkspaceMetadataStore` record service.
- `@cobalt-web/workspace/storage` — `WorkspaceObjectStorage` byte service.
- `@cobalt-web/workspace/schemas` — Effect schemas and schema-derived domain types.
- `@cobalt-web/workspace/paths` — canonical mount paths and scoped object keys.
- `@cobalt-web/workspace/bridge` — versioned server-to-worker messages and fail-closed bearer authentication.
- `@cobalt-web/workspace/testing` — deterministic fixtures and in-memory services/layers.

## Effect conventions

Services are `Context.Service` values, implementations are supplied as `Layer`s, expected failures are schema-backed tagged errors, command and byte output use `Stream`, and wire/domain types are derived from Effect Schema. Standard Schema consumers can use the exported adapters or `Schema.toStandardSchemaV1`.

Provider adapters convert SDK promises with `Effect.tryPromise` and map provider failures into the stable errors exported here. Application HTTP boundaries may use a `ManagedRuntime` or `Effect.runPromise`; promise execution should not leak into domain services.

## Provider ownership

Cloudflare Sandbox Bridge integration belongs to `apps/workspace-worker` and the later server adapter. Database persistence and R2 storage belong to their provider packages. Provider IDs, bindings, request payloads, and SDK errors must not cross this package boundary.

Canonical mounts are `/mnt/uploads` (read-only), `/mnt/outputs` (read/write), and `/workspace` (ephemeral read/write). Object keys are scoped as `users/{base64url-user-id}/workspaces/{workspace-id}/{uploads|outputs}/{file-id}`.

# Cloudflare Sandbox validation operations

Run from `scripts/workspace-infra/cloudflare-sandbox-validation`.

## Prerequisites

```sh
npx wrangler whoami
docker info
npm ci
```

Wrangler must have `workers:write` and `containers:write`. Docker must be
running because Wrangler builds and pushes the container image during deploy.
No Cloudflare dashboard step was required on the tested Workers Paid account.

## Deploy and smoke test

```sh
npm run deploy:smoke
```

For individual operations:

```sh
npm run typegen
npm test
npm run check-types
npx wrangler deploy --dry-run
npx wrangler deploy
npx wrangler tail --format pretty
```

The Worker fails closed until `SMOKE_AUTH_TOKEN` is configured with
`wrangler secret put`. Never add this value to `wrangler.jsonc`, `.dev.vars`,
shell history, or a committed file.

## Teardown

```sh
npm run teardown
```

Confirm no disposable application remains:

```sh
npx wrangler containers list
```

## Resource naming

- Disposable validation: `cobalt-sri-359-sandbox-validation`
- Future preview: `cobalt-workspace-preview`
- Future staging: `cobalt-workspace-staging`
- Future production: `cobalt-workspace-production`

Only the disposable validation resource exists in this spike. The future
environment names are a proposed convention, not provisioned resources.

## Deferred R2 variables

No R2 resources or variables are created by this spike. A later pass must add
and validate bucket names, mount credentials, per-workspace prefix isolation,
read-only uploads, read-write outputs, and teardown behavior.

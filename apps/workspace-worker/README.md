# Workspace worker

Authenticated Cloudflare Worker bridge for Cobalt workspace Sandboxes. The bridge is a
server-to-server API; it must not be called by browsers.

## Security boundary

- Every request is signed with HMAC-SHA256 using `BRIDGE_AUTH_SECRET`.
- The signature covers `timestamp + method + pathname + raw body`; timestamps may differ by at
  most five minutes.
- The Worker derives an opaque Sandbox ID from the trusted `scope.userId + scope.workspaceId`.
  No API accepts a Sandbox or Durable Object ID.
- Uploads and outputs use prefixes derived from the same scope. Uploads are mounted read-only and
  outputs are mounted writable, through separate `WORKSPACE_UPLOADS` and `WORKSPACE_OUTPUTS`
  bindings.
- Paths must be canonical and remain under `/workspace`, `/mnt/uploads`, or `/mnt/outputs`.
- Command executables are restricted to Bash and Python. Only `LANG`, `LC_ALL`, `PYTHONPATH`,
  `PYTHONUNBUFFERED`, and `TZ` may be supplied in the command environment.

The request headers are:

```text
content-type: application/json
x-cobalt-timestamp: <Unix epoch milliseconds>
x-cobalt-signature: <lowercase hex HMAC-SHA256>
```

The signed message is exactly:

```text
<timestamp>\n<uppercase method>\n<pathname>\n<raw request body>
```

All operations are `POST /v1/bridge` with the versioned envelope from
`@cobalt-web/workspace`. Supported `_tag` values are `CreateWorkspace`, `WakeWorkspace`,
`StopWorkspace`, `ExecuteCommand`, `CancelExecution`, `ReadFile`, `WriteFile`, and `ListFiles`.
For the MVP, execution waits and returns `{ stdout, stderr, exitCode, success }`; command output is
not streamed. File writes use `contentBase64`, are capped at 10 MiB, and may not target uploads.

## Lifecycle and persistence

Create and wake both lazily resolve the scope-derived Sandbox and re-establish both R2 mounts.
Stop destroys it. Lifecycle transitions use at most three bounded retries, and repeated stop calls
are successful when the Sandbox is already absent. Commands run as managed processes so timeout
and cancellation explicitly kill the process.

The container filesystem and process table are scratch state. They disappear when a Sandbox
sleeps. Durable inputs and outputs must live in the R2 mounts; no behavior depends on
`/workspace` surviving a sleep.

## Local development

```sh
cp .dev.vars.example .dev.vars
bun run typegen
bun test
bun run check-types
bun run dev
```

`LOCAL_R2_MOUNTS=true` selects the Sandbox SDK's local R2 binding synchronization. Wrangler binds
the same local bucket twice, while the Worker supplies different prefixes and permissions to each
mount.

## Live configuration still required

No production resources are created by this package. Before a live deployment:

1. Create or select the R2 bucket and replace `cobalt-workspaces` in `wrangler.jsonc` if needed.
2. Confirm both Worker R2 bindings reference that bucket and have the desired environment-specific
   resource names.
3. Configure `BRIDGE_AUTH_SECRET` with `wrangler secret put BRIDGE_AUTH_SECRET`; never place it in
   source, Wrangler vars, or shell history.
4. Configure the Cobalt server to generate the HMAC headers above after it verifies workspace
   ownership.
5. Validate account container capacity and tune `max_instances` for the environment.
6. Run a live smoke test that reads a PyPDF input from `/mnt/uploads` and writes the result to
   `/mnt/outputs` before approving deployment.

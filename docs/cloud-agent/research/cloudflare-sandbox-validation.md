# Decision record: Cloudflare Sandbox runtime validation

- Issue: SRI-359
- Observed: 2026-08-16, Cloudflare account `56a59405fd390a7ad2808f173cab5345`
- SDK and image: `@cloudflare/sandbox` 0.12.7 and
  `cloudflare/sandbox:0.12.7-python`
- Wrangler: 4.123.0
- Decision: **Go for the SRI-361 workspace Worker, with lifecycle retries and
  explicit durable storage. R2 validation remains a separate gate.**

## Observed behavior

The disposable production deployment passed all runtime checks:

| Check | Observed result |
| --- | --- |
| Bash | Bash 5.1.16 executed successfully. |
| Linux commands | `bash`, Python, pip, `uname`, and `id` executed. The image ran commands as `root` inside an x86_64 Firecracker Linux container. |
| Python | Python 3.11.14 executed successfully. |
| PyPDF | PyPDF 6.16.1 opened a baked one-page PDF and read its title metadata. |
| Exit behavior | stdout and stderr were distinct and exit code 23 was preserved. |
| Streaming | Three stdout events reached the client at 115ms, 1,136ms, and 2,124ms; completion arrived at 3,121ms. Output was not buffered until completion. |
| Active lifecycle | A marker written in `/workspace` was readable while the container stayed active. |
| Idle lifecycle | With `sleepAfter: "30s"`, a request after 45 seconds woke in 2,153ms and the marker was gone. Container filesystem state is ephemeral across sleep. |
| Explicit destroy | Destroy followed by recreation took 11,873ms and required two attempts. The first immediate command was interrupted while RPC state was replaced. The marker remained deleted. |

Measured request timings from the successful run:

- Fresh sandbox validation: 11,946ms
- Warm validation of the same five commands: 539ms
- Streaming command: 3,142ms total; 2,009ms between first and last stdout events
- Active marker read: 74ms
- Idle wake and marker read: 2,153ms, one attempt
- Destroy/recreate and marker read: 11,873ms, two attempts
- Worker bundle upload: 2.21s; reported Worker startup: 7ms
- First Python image upload and application provisioning: roughly 2m13s locally

An intentional overlapping-sandbox probe with `max_instances: 1` produced
`Maximum number of running container instances exceeded`. The SDK retried with
backoff and the first command completed after 65,150ms once capacity became
available. This is a real failure mode, not a normal cold-start measurement.

## Documented assumptions

Cloudflare documents that a sandbox is a Durable Object backed by a dedicated
container, defaults to a ten-minute idle timeout, and loses filesystem,
process, session, and interpreter state when the container stops. The SDK's
current migration guidance recommends RPC transport and
`enableDefaultSession: false`; the older HTTP/WebSocket transports and default
session behavior are deprecated.

Sources:

- <https://developers.cloudflare.com/sandbox/get-started/>
- <https://developers.cloudflare.com/sandbox/concepts/sandboxes/>
- <https://developers.cloudflare.com/sandbox/api/commands/>
- <https://developers.cloudflare.com/sandbox/guides/2026-deprecation/>
- <https://developers.cloudflare.com/sandbox/platform/limits/>

## Architecture consequences for SRI-361

1. Configure RPC transport and disable the implicit default session. Use an
   explicit session only when shell state must carry between commands.
2. Treat `/workspace` as scratch, not durable storage. Rehydrate inputs after
   sleep/recreation and persist outputs before returning success.
3. Retry documented transient startup/capacity errors and
   `OperationInterruptedError` around wake/destroy transitions with a bounded
   budget. Surface retry count and phase in telemetry.
4. Size `max_instances` for expected concurrent workspaces. A setting of one
   serializes unrelated sandbox IDs and can turn contention into minute-scale
   latency.
5. The Python-tagged image is required; the default 0.12.7 image has no Python
   or pip. Pin the SDK and image to the same version.
6. The tested image executes as root. The production image should follow
   Cloudflare's bridge pattern and create a non-root workspace user as
   defense-in-depth before accepting untrusted commands.
7. Keep the Worker server-to-server and fail closed on authentication. Never
   expose arbitrary command endpoints directly to browsers.

## Deferred gate

This run intentionally did not create or mount R2. Before durable workspace
rollout, separately verify per-workspace prefix isolation, read-only uploads,
read-write outputs, object visibility after command completion, mount latency,
credential scope, and cleanup.

# \_legacy

Quarantined sandbox runtime + agent-bridge. Replaced by TanStack Code Mode (QuickJS WASM) at `src/ai/agents/code-agent/code-runtime.ts`.

Kept around in case we need to fall back to the Daytona / Vercel Sandbox / signed-JWT bridge approach. The `/api/agent-bridge` route is still mounted from `src/index.ts`, so this code is live but no longer on the agent code-execution path.

## Contents

- `mcp/services/sandbox-runner.ts` — backend selector (Daytona vs Vercel)
- `mcp/services/sandbox-runner-daytona.ts` — Daytona implementation
- `mcp/services/sandbox-runner-vercel.ts` — Vercel Sandbox implementation
- `mcp/services/sandbox-runner-types.ts` — shared types/constants
- `mcp/services/cobalt-sdk-shim.ts` — JS SDK shim previously prepended to user code
- `api/internal/agent-bridge/exec.ts` — Hono router that the sandbox calls back into
- `api/internal/agent-bridge/registry.ts` — allowlisted route table (now mirrored in `ai/agents/code-agent/bindings.ts`)
- `api/internal/agent-bridge/jwt.ts` — signed-bridge-token sign/verify

## Env vars (still read by these files)

- `AGENT_BRIDGE_SECRET` — bridge JWT signing key
- `BRIDGE_URL` — sandbox-side callback URL
- `DAYTONA_*` — Daytona SDK config
- `VERCEL_TOKEN` / `VERCEL_TEAM_ID` / `VERCEL_PROJECT_ID` — Vercel Sandbox config

If we delete this folder later, also remove these env vars and unmount `/api/agent-bridge` in `src/index.ts`.

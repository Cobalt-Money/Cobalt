import { getSandbox } from "@cloudflare/sandbox";
import type { Sandbox as SandboxDurableObject } from "@cloudflare/sandbox";

import type { SandboxClient, WorkspaceWorkerEnv } from "./types";
import { createWorkspaceWorker } from "./worker";

export { Sandbox } from "@cloudflare/sandbox";

type SandboxBinding = Parameters<typeof getSandbox<SandboxDurableObject>>[0];

interface Env extends WorkspaceWorkerEnv {
  readonly Sandbox: SandboxBinding;
}

const SANDBOX_OPTIONS = {
  enableDefaultSession: false,
  normalizeId: true,
  sleepAfter: "10m",
  transport: "rpc",
} as const;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const worker = createWorkspaceWorker({
      getSandbox: (sandboxId) =>
        getSandbox(env.Sandbox, sandboxId, SANDBOX_OPTIONS) as unknown as SandboxClient,
    });
    return worker.fetch(request, env);
  },
};

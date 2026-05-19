import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { ToolRendererContext } from "../types";
import { toolRendererKey } from "../types";

interface BashInvocation {
  type: "tool-bash";
  toolCallId: string;
  state: string;
  input?: { command?: string };
  output?: { stdout?: string; stderr?: string; exitCode?: number };
  errorText?: string;
}

export function BashToolRenderer({
  invocation,
  context,
}: {
  invocation: BashInvocation;
  context: ToolRendererContext;
}) {
  const command = invocation.input?.command ?? "";

  return (
    <div className="flex items-center gap-2 py-1" key={toolRendererKey(context, "bash")}>
      <HugeiconsIcon icon={Search01Icon} className="size-3.5 text-muted-foreground shrink-0" />
      <code className="text-sm font-mono text-foreground truncate">$ {command}</code>
    </div>
  );
}

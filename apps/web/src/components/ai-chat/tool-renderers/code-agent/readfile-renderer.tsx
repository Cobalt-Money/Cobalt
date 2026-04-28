import { File01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { ToolRendererContext } from "../types";
import { toolRendererKey } from "../types";

interface ReadFileInvocation {
  type: "tool-readFile";
  toolCallId: string;
  state: string;
  input?: { path?: string };
  output?: { content?: string };
  errorText?: string;
}

function extractFilename(path: string): string {
  if (!path) {
    return "";
  }
  const parts = path.split("/");
  return parts.at(-1) ?? path;
}

export function ReadFileToolRenderer({
  invocation,
  context,
}: {
  invocation: ReadFileInvocation;
  context: ToolRendererContext;
}) {
  const path = invocation.input?.path ?? "";
  const filename = extractFilename(path);

  return (
    <div key={toolRendererKey(context, "readfile")} className="pb-2">
      <div className="flex items-center gap-2 py-1">
        <HugeiconsIcon
          icon={File01Icon}
          className="size-3.5 text-muted-foreground shrink-0"
        />
        <span className="text-sm text-foreground truncate">
          {filename || path || "File"}
        </span>
        {path && filename !== path && (
          <span className="text-xs text-muted-foreground truncate" title={path}>
            {path}
          </span>
        )}
      </div>
    </div>
  );
}

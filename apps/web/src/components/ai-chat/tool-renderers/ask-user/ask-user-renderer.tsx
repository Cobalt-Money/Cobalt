import { Shimmer } from "@cobalt-web/ui/components/ai-elements/shimmer";
import { CheckIcon, CircleHelpIcon } from "lucide-react";

import type { ToolRendererContext } from "../types";
import { toolRendererKey } from "../types";

interface AskUserInvocation {
  type: "tool-askUser";
  toolCallId: string;
  state: string;
  input?: {
    question: string;
    options: { value: string; label: string; description?: string }[];
  };
  output?: unknown;
  errorText?: string;
}

export function AskUserToolRenderer({
  invocation: part,
  context,
}: {
  invocation: AskUserInvocation;
  context: ToolRendererContext;
}) {
  if (part.state === "input-streaming") {
    return (
      <div key={toolRendererKey(context, "ask-user-loading")} className="py-2">
        <Shimmer>Preparing a question...</Shimmer>
      </div>
    );
  }

  if (part.state === "input-available") {
    return (
      <div
        key={toolRendererKey(context, "ask-user-pending")}
        className="py-2 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <CircleHelpIcon className="size-3.5" />
        <span>Waiting for your answer below...</span>
      </div>
    );
  }

  if (part.state === "output-available") {
    const selected = part.output as {
      selectedValue: string;
      selectedLabel: string;
    } | null;

    return (
      <div
        key={toolRendererKey(context, "ask-user-done")}
        className="py-2 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <CheckIcon className="size-3.5 text-primary" />
        <span>
          {part.input?.question}
          {selected && (
            <span className="font-medium text-foreground">
              {" "}
              &mdash; {selected.selectedLabel}
            </span>
          )}
        </span>
      </div>
    );
  }

  return null;
}

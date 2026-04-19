import {
  Task,
  TaskContent,
  TaskTrigger,
} from "@cobalt-web/ui/components/ai-elements/task";
import type { UIMessage } from "ai";
import type { ReactNode } from "react";

import { useAutoCollapse } from "@/hooks/use-auto-collapse";

type MessagePart = UIMessage["parts"][number];

function isToolStreaming(part: MessagePart): boolean {
  const { state } = part as { state?: string };
  return state !== "output-available" && state !== "output-error";
}

function getStepTitle(parts: MessagePart[], isStreaming: boolean): string {
  if (isStreaming) {
    return "Working...";
  }
  const counts = new Map<string, number>();
  for (const p of parts) {
    if (typeof p.type === "string" && p.type.startsWith("tool-")) {
      const name = p.type.slice("tool-".length);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  if (counts.size === 0) {
    return "Step";
  }
  const entries = [...counts.entries()].map(([name, count]) =>
    count > 1 ? `${name} × ${count}` : name
  );
  return `Ran ${entries.join(", ")}`;
}

interface StepTaskProps {
  messageId: string;
  stepIndex: number;
  parts: MessagePart[];
  renderPart: (part: MessagePart, partIndex: number) => ReactNode;
  messageIsStreaming: boolean;
}

export function StepTask({
  messageId,
  stepIndex,
  parts,
  renderPart,
  messageIsStreaming,
}: StepTaskProps) {
  // Keep expanded while the overall message is streaming — prevents the
  // Task from collapsing in the gap between sequential tool calls (common
  // with Anthropic models where the model thinks 1-3s between tools).
  const anyToolStreaming = parts.some(isToolStreaming);
  const isActive = messageIsStreaming || anyToolStreaming;
  const { isOpen, handleOpenChange } = useAutoCollapse(isActive);
  const title = getStepTitle(parts, isActive);

  return (
    <Task
      key={`${messageId}-step-${stepIndex}`}
      className="pb-2"
      onOpenChange={handleOpenChange}
      open={isOpen}
    >
      <TaskTrigger title={title} />
      <TaskContent>{parts.map((part, i) => renderPart(part, i))}</TaskContent>
    </Task>
  );
}

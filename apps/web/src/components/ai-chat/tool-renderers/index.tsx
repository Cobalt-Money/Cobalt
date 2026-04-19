import { Shimmer } from "@cobalt-web/ui/components/ai-elements/shimmer";
import type { UIMessage } from "ai";
import { memo } from "react";

import { AskUserToolRenderer } from "./ask-user/ask-user-renderer";
import { RenderChartToolRenderer } from "./charts/render-chart";
import { BashToolRenderer } from "./code-agent/bash-renderer";
import { ReadFileToolRenderer } from "./code-agent/readfile-renderer";
import { SqlToolRenderer } from "./code-agent/sql-renderer";
import { MathComputationToolRenderer } from "./computation/math-computation";
import { RenderDocumentToolRenderer } from "./documents/render-document";
import type { ToolRendererContext } from "./types";
import { toolRendererKey } from "./types";
import { WebExtractToolRenderer } from "./web-extract/web-extract-renderer";
import { WebSearchToolRenderer } from "./web-search/web-search-renderer";

type MessagePart = UIMessage["parts"][number];

interface ToolPartShape {
  type: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

function arePartsEqual(
  prev: { part: MessagePart; context: ToolRendererContext },
  next: { part: MessagePart; context: ToolRendererContext }
): boolean {
  if (
    prev.context.messageId !== next.context.messageId ||
    prev.context.partIndex !== next.context.partIndex
  ) {
    return false;
  }
  const a = prev.part as ToolPartShape;
  const b = next.part as ToolPartShape;
  if (
    a.type !== b.type ||
    a.toolCallId !== b.toolCallId ||
    a.state !== b.state ||
    a.errorText !== b.errorText
  ) {
    return false;
  }
  // Once state is terminal, input/output can't change — skip JSON compare.
  if (a.state === "output-available" || a.state === "output-error") {
    return true;
  }
  return a.input === b.input && a.output === b.output;
}

export const ToolPartRenderer = memo(function ToolPartRenderer({
  part,
  context,
}: {
  part: MessagePart;
  context: ToolRendererContext;
}) {
  if (part.type === "tool-webSearch") {
    return (
      <WebSearchToolRenderer context={context} invocation={part as never} />
    );
  }

  if (part.type === "tool-webExtract") {
    return (
      <WebExtractToolRenderer context={context} invocation={part as never} />
    );
  }

  if (part.type === "tool-renderChart") {
    return (
      <RenderChartToolRenderer context={context} invocation={part as never} />
    );
  }

  if (part.type === "tool-renderDocument") {
    if (part.state === "input-available" || part.state === "input-streaming") {
      return (
        <div
          key={toolRendererKey(context, "document-loading")}
          className="py-1"
        >
          <Shimmer className="text-sm">Cooking up the PDF</Shimmer>
        </div>
      );
    }
    return (
      <RenderDocumentToolRenderer
        context={context}
        invocation={part as never}
      />
    );
  }

  if (part.type === "tool-compute") {
    return (
      <MathComputationToolRenderer
        context={context}
        invocation={part as never}
      />
    );
  }

  if (part.type === "tool-askUser") {
    return <AskUserToolRenderer context={context} invocation={part as never} />;
  }

  if (part.type === "tool-bash") {
    return <BashToolRenderer context={context} invocation={part as never} />;
  }

  if (part.type === "tool-runSql") {
    return <SqlToolRenderer context={context} invocation={part as never} />;
  }

  if (part.type === "tool-readFile") {
    return (
      <ReadFileToolRenderer context={context} invocation={part as never} />
    );
  }

  return null;
}, arePartsEqual);

export { ToolErrorCard, ToolLoadingSkeleton } from "./shared";
export type { ToolRendererContext } from "./types";
export { toolRendererKey } from "./types";

import { MessageResponse } from "@cobalt-web/ui/components/ai-elements/message";
import type { UIMessage } from "ai";
import type { ReactNode } from "react";
import { memo } from "react";

import { useAgentSettings } from "../state/agent-settings-context";
import { ToolPartRenderer } from "../tool-renderers";
import type { ToolRendererContext } from "../tool-renderers";
import { CitationComponent } from "../tool-renderers/citation/citation-component";
import { ReasoningBlock } from "./reasoning-block";
import { StepTask } from "./step-task";
import { charsPerSecForModel, useSmoothText } from "./use-smooth-text";

type MessagePart = UIMessage["parts"][number];

const citationComponents = { cite: CitationComponent };
const citationAllowedTags = { cite: ["url", "title", "excerpt"] };

interface TextPartProps {
  text: string;
  isStreaming: boolean;
  hasWebSearchOutput: boolean;
}

/** Text bubble with smoothed typewriter reveal layered under streamdown's
 * per-word animation. Hook only smooths while streaming; once the source text
 * stops growing, the RAF loop catches up and terminates. */
const TextPart = memo(function TextPart({
  text,
  isStreaming,
  hasWebSearchOutput,
}: TextPartProps) {
  const { settings } = useAgentSettings();
  const smoothed = useSmoothText(text, {
    charsPerSec: charsPerSecForModel(settings.model),
  });
  const isAnimating = isStreaming || smoothed.length < text.length;
  return (
    <div className="[&_ul]:pl-6 [&_ol]:pl-6 [&_li]:mb-1 [&_ul_ul]:pl-6 [&_ol_ol]:pl-6 [&_ul_ol]:pl-6 [&_ol_ul]:pl-6">
      <MessageResponse
        isAnimating={isAnimating}
        {...(hasWebSearchOutput
          ? {
              allowedTags: citationAllowedTags,
              components: citationComponents,
            }
          : {})}
      >
        {smoothed}
      </MessageResponse>
    </div>
  );
});

type RenderItem =
  | { kind: "step"; stepIndex: number; parts: MessagePart[] }
  | { kind: "part"; part: MessagePart; partIndex: number };

function buildRenderItems(parts: readonly MessagePart[]): RenderItem[] {
  const items: RenderItem[] = [];
  let currentGroup: MessagePart[] | null = null;
  let groupIndex = 0;

  const flushGroup = () => {
    if (currentGroup && currentGroup.length > 0) {
      groupIndex += 1;
      items.push({ kind: "step", parts: currentGroup, stepIndex: groupIndex });
    }
    currentGroup = null;
  };

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part) {
      continue;
    }
    const { type } = part;

    if (type === "reasoning" || type === "step-start") {
      continue;
    }
    if (typeof type === "string" && type.startsWith("tool-")) {
      currentGroup ??= [];
      currentGroup.push(part);
      continue;
    }
    flushGroup();
    items.push({ kind: "part", part, partIndex: i });
  }

  flushGroup();
  return items;
}

interface MessagePartsRendererProps {
  message: UIMessage;
  isStreaming: boolean;
}

export const MessagePartsRenderer = memo(function MessagePartsRenderer({
  message,
  isStreaming,
}: MessagePartsRendererProps) {
  const hasWebSearchOutput = message.parts.some(
    (p) =>
      p.type === "tool-webSearch" &&
      (p as { state?: string }).state === "output-available"
  );

  // Consolidate all reasoning parts into one block (ai-elements reasoning pattern).
  const reasoningText = message.parts
    .filter((p) => p.type === "reasoning")
    .map((p) => (p as { text: string }).text)
    .join("\n\n");

  // Match ai-elements: streaming reasoning only while the latest part is still reasoning.
  const lastPart = message.parts.at(-1);
  const isReasoningStreaming = isStreaming && lastPart?.type === "reasoning";

  const renderPart = (part: MessagePart, partIndex: number): ReactNode => {
    const context: ToolRendererContext = {
      chatId: undefined,
      messageId: message.id,
      partIndex,
    };

    if (part.type === "text") {
      return (
        <TextPart
          // eslint-disable-next-line react/no-array-index-key
          key={`${message.id}-text-${partIndex}`}
          hasWebSearchOutput={hasWebSearchOutput}
          isStreaming={isStreaming}
          text={part.text}
        />
      );
    }

    return (
      <ToolPartRenderer
        // eslint-disable-next-line react/no-array-index-key
        key={`${message.id}-${part.type}-${partIndex}`}
        context={context}
        part={part}
      />
    );
  };

  const items = buildRenderItems(message.parts);

  return (
    <>
      {reasoningText.length > 0 && (
        <ReasoningBlock
          isStreaming={isReasoningStreaming}
          text={reasoningText}
        />
      )}
      {items.map((item) => {
        if (item.kind === "step") {
          return (
            <StepTask
              key={`${message.id}-step-${item.stepIndex}`}
              messageId={message.id}
              messageIsStreaming={isStreaming}
              parts={item.parts}
              renderPart={renderPart}
              stepIndex={item.stepIndex}
            />
          );
        }
        return renderPart(item.part, item.partIndex);
      })}
    </>
  );
});

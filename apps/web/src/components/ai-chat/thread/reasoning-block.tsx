import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@cobalt-web/ui/components/ai-elements/reasoning";

import { useAutoCollapse } from "@/hooks/use-auto-collapse";

interface ReasoningBlockProps {
  text: string;
  isStreaming: boolean;
}

export function ReasoningBlock({ text, isStreaming }: ReasoningBlockProps) {
  const { isOpen, handleOpenChange } = useAutoCollapse(isStreaming);

  return (
    <Reasoning
      className="w-full"
      isStreaming={isStreaming}
      onOpenChange={handleOpenChange}
      open={isOpen}
    >
      <ReasoningTrigger />
      <ReasoningContent>{text}</ReasoningContent>
    </Reasoning>
  );
}

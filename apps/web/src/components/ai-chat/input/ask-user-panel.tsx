import { Queue } from "@cobalt-web/ui/components/ai-elements/queue";
import { Button } from "@cobalt-web/ui/components/button";
import { cobaltGhostSurfaceClass } from "@cobalt-web/ui/cobalt/prompt-input";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  HelpCircleIcon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState } from "react";

import { useChat } from "@/components/ai-chat/state/chat-context";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];
const OTHER_VALUE = "__other__";

export interface PendingAskUserQuestion {
  toolCallId: string;
  question: string;
  options: { value: string; label: string; description?: string }[];
}

interface AskUserPanelProps {
  chatId: string;
  questions: PendingAskUserQuestion[];
}

export function AskUserPanel({ chatId, questions }: AskUserPanelProps) {
  const { addToolOutputs } = useChat();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const otherInputRef = useRef<HTMLInputElement>(null);

  if (questions.length === 0) {
    return null;
  }

  const safeIndex = Math.min(currentIndex, questions.length - 1);
  const current = questions[safeIndex];
  if (!current) {
    return null;
  }

  const selectedValue = selections[current.toolCallId];
  const isOtherSelected = selectedValue === OTHER_VALUE;
  const currentOtherText = otherText[current.toolCallId] ?? "";
  const selectedOption =
    selectedValue && !isOtherSelected
      ? current.options.find((o) => o.value === selectedValue)
      : null;

  const isCurrentAnswered =
    selectedOption !== undefined || (isOtherSelected && currentOtherText.trim().length > 0);

  // Submit only enabled when EVERY question answered. Server's askUser tool
  // is fired in parallel — answering one at a time drops unresolved parts in
  // convertToModelMessages and the model re-asks the rest.
  const allAnswered = questions.every((q) => {
    const sel = selections[q.toolCallId];
    if (!sel) {
      return false;
    }
    if (sel === OTHER_VALUE) {
      return (otherText[q.toolCallId] ?? "").trim().length > 0;
    }
    return q.options.some((o) => o.value === sel);
  });

  const handleSelect = (value: string) => {
    setSelections((prev) => ({ ...prev, [current.toolCallId]: value }));
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      return;
    }
    const items = questions.map((q) => {
      const sel = selections[q.toolCallId];
      if (sel === OTHER_VALUE) {
        return {
          output: {
            selectedLabel: (otherText[q.toolCallId] ?? "").trim(),
            selectedValue: "other",
          },
          toolCallId: q.toolCallId,
        };
      }
      const opt = q.options.find((o) => o.value === sel);
      return {
        output: {
          selectedLabel: opt?.label ?? "",
          selectedValue: opt?.value ?? "",
        },
        toolCallId: q.toolCallId,
      };
    });
    setSelections({});
    setOtherText({});
    try {
      await addToolOutputs({ chatId, items });
    } catch (error) {
      console.error("[ask-user] submit failed:", error);
    }
  };

  const canPrev = safeIndex > 0;
  const canNext = safeIndex < questions.length - 1;

  return (
    <Queue className={cn("mb-2 w-full rounded-2xl px-3 pt-2 pb-2", cobaltGhostSurfaceClass)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
          <HugeiconsIcon icon={HelpCircleIcon} className="size-4" />
          <span>Questions</span>
        </div>
        <div className="flex items-center gap-2">
          {questions.length > 1 && (
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <button
                className="p-0.5 hover:text-foreground disabled:opacity-30"
                disabled={!canPrev}
                onClick={() => setCurrentIndex((i) => i - 1)}
                type="button"
              >
                <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
              </button>
              <span>
                {safeIndex + 1} of {questions.length}
              </span>
              <button
                className="p-0.5 hover:text-foreground disabled:opacity-30"
                disabled={!canNext}
                onClick={() => setCurrentIndex((i) => i + 1)}
                type="button"
              >
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
              </button>
            </div>
          )}
          <Button
            className="h-6 gap-1 px-2 text-xs"
            disabled={!allAnswered}
            onClick={handleSubmit}
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon icon={SentIcon} className="size-3" />
            Submit
          </Button>
        </div>
      </div>

      <div className="px-2 pt-1">
        <p className="font-medium text-foreground text-sm">
          {questions.length > 1 && `${safeIndex + 1}. `}
          {current.question}
        </p>
      </div>

      <div className="flex flex-col gap-1 pt-2 pb-1">
        {current.options.map((option, idx) => {
          const isSelected = selectedValue === option.value;
          return (
            <button
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                isSelected ? "bg-primary/10" : "hover:bg-black/5 dark:hover:bg-white/5",
              )}
              key={option.value}
              onClick={() => handleSelect(option.value)}
              type="button"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded font-semibold text-xs",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/15 text-muted-foreground",
                )}
              >
                {OPTION_LETTERS[idx] ?? String(idx + 1)}
              </span>
              <span className={cn(isSelected ? "text-foreground" : "text-muted-foreground")}>
                {option.label}
                {option.description && (
                  <span
                    className={cn(
                      isSelected ? "text-muted-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {" "}
                    &mdash; {option.description}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {(() => {
          const otherLetter =
            OPTION_LETTERS[current.options.length] ?? String(current.options.length + 1);
          return isOtherSelected ? (
            <div className="flex items-center gap-2.5 rounded-md bg-primary/10 px-2 py-1.5 text-left text-sm">
              <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary font-semibold text-primary-foreground text-xs">
                {otherLetter}
              </span>
              <input
                className="min-w-0 flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground/60"
                onChange={(e) =>
                  setOtherText((prev) => ({
                    ...prev,
                    [current.toolCallId]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isCurrentAnswered && allAnswered) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Type your answer..."
                ref={otherInputRef}
                type="text"
                value={currentOtherText}
              />
            </div>
          ) : (
            <button
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => {
                handleSelect(OTHER_VALUE);
                setTimeout(() => otherInputRef.current?.focus(), 0);
              }}
              type="button"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted-foreground/15 font-semibold text-muted-foreground text-xs">
                {otherLetter}
              </span>
              <span className="text-muted-foreground">Other...</span>
            </button>
          );
        })()}
      </div>
    </Queue>
  );
}

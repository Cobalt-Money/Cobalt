import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowDown01Icon, SparklesIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useSubscriptionStatus } from "@/hooks/use-subscription-status";

import { useAgentSettings } from "../state/agent-settings-context";
import type { AgentEffort } from "../state/agent-settings-context";

interface ModelDef {
  id: string;
  label: string;
  maxEffort: AgentEffort;
  proOnly: boolean;
  shortLabel: string;
  supportsReasoning: boolean;
}

const HAIKU_MODEL_ID = "anthropic/claude-haiku-4.5";

const MODELS: ModelDef[] = [
  {
    id: "anthropic/claude-opus-4.7",
    label: "Claude Opus 4.7",
    maxEffort: "max",
    proOnly: true,
    shortLabel: "Opus 4.7",
    supportsReasoning: true,
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    maxEffort: "high",
    proOnly: true,
    shortLabel: "Sonnet 4.6",
    supportsReasoning: true,
  },
  {
    id: HAIKU_MODEL_ID,
    label: "Claude Haiku 4.5",
    maxEffort: "high",
    proOnly: false,
    shortLabel: "Haiku 4.5",
    supportsReasoning: false,
  },
];

const ALL_EFFORTS: { id: AgentEffort; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "max", label: "Max" },
];

const EFFORT_ORDER: Record<AgentEffort, number> = {
  high: 2,
  low: 0,
  max: 3,
  medium: 1,
};

function useModelPickerState() {
  const { settings, setSettings } = useAgentSettings();
  const { hasActiveSubscription } = useSubscriptionStatus();

  const isModelAllowed = (model: ModelDef) => hasActiveSubscription || !model.proOnly;

  const requestedModel = MODELS.find((m) => m.id === settings.model) ?? MODELS[0];
  const currentModel =
    requestedModel && isModelAllowed(requestedModel)
      ? requestedModel
      : (MODELS.find((m) => m.id === HAIKU_MODEL_ID) ?? MODELS[0]);

  const canReason = (currentModel?.supportsReasoning ?? false) && hasActiveSubscription;
  const availableEfforts = ALL_EFFORTS.filter(
    (e) => EFFORT_ORDER[e.id] <= EFFORT_ORDER[currentModel?.maxEffort ?? "high"],
  );

  const selectModel = (modelId: string) => {
    const model = MODELS.find((m) => m.id === modelId);
    if (!model || !isModelAllowed(model)) {
      return;
    }
    const clampedEffort =
      model.supportsReasoning && EFFORT_ORDER[settings.effort] > EFFORT_ORDER[model.maxEffort]
        ? model.maxEffort
        : settings.effort;
    setSettings({
      effort: clampedEffort,
      model: modelId,
      reasoning: model.supportsReasoning && hasActiveSubscription ? settings.reasoning : false,
    });
  };

  const selectEffort = (effort: AgentEffort) => setSettings({ effort });

  const toggleReasoning = () => {
    if (canReason) {
      setSettings({ reasoning: !settings.reasoning });
    }
  };

  return {
    availableEfforts,
    canReason,
    currentModel,
    hasActiveSubscription,
    isModelAllowed,
    selectEffort,
    selectModel,
    settings,
    toggleReasoning,
  };
}

interface ModelPickerProps {
  isStreaming: boolean;
}

/** Compact single-chip dropdown for the collapsed pill input. */
export function ModelChip({ isStreaming }: ModelPickerProps) {
  const {
    availableEfforts,
    canReason,
    currentModel,
    hasActiveSubscription,
    isModelAllowed,
    selectEffort,
    selectModel,
    settings,
    toggleReasoning,
  } = useModelPickerState();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
          isStreaming && "pointer-events-none opacity-50",
        )}
        disabled={isStreaming}
      >
        {currentModel?.shortLabel}
        {settings.reasoning && canReason && (
          <>
            <span className="text-muted-foreground/60">·</span>
            <HugeiconsIcon className="size-3 text-primary" icon={SparklesIcon} strokeWidth={2} />
            <span className="capitalize text-primary">{settings.effort}</span>
          </>
        )}
        <HugeiconsIcon className="size-3" icon={ArrowDown01Icon} strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <ModelMenuContents
          availableEfforts={availableEfforts}
          canReason={canReason}
          hasActiveSubscription={hasActiveSubscription}
          isModelAllowed={isModelAllowed}
          selectEffort={selectEffort}
          selectModel={selectModel}
          settings={settings}
          toggleReasoning={toggleReasoning}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Expanded toolbar version for the open input. */
export function ModelPicker({ isStreaming }: ModelPickerProps) {
  const {
    availableEfforts,
    canReason,
    currentModel,
    hasActiveSubscription,
    isModelAllowed,
    selectEffort,
    selectModel,
    settings,
    toggleReasoning,
  } = useModelPickerState();

  return (
    <div className="flex items-center gap-1">
      {/* Model picker */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          disabled={isStreaming}
        >
          {currentModel?.shortLabel}
          <HugeiconsIcon className="size-3" icon={ArrowDown01Icon} strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <ModelMenuContents
            availableEfforts={availableEfforts}
            canReason={canReason}
            hasActiveSubscription={hasActiveSubscription}
            isModelAllowed={isModelAllowed}
            selectEffort={selectEffort}
            selectModel={selectModel}
            settings={settings}
            toggleReasoning={toggleReasoning}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reasoning toggle — shows effort when active */}
      <button
        className={cn(
          "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
          settings.reasoning && canReason
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground",
          !canReason && "cursor-not-allowed opacity-40",
        )}
        disabled={!canReason || isStreaming}
        title={canReason ? "Toggle extended thinking" : "Not available for this model"}
        type="button"
        onClick={toggleReasoning}
      >
        <HugeiconsIcon className="size-3" icon={SparklesIcon} strokeWidth={2} />
        {settings.reasoning && canReason ? (
          <span className="capitalize">{settings.effort}</span>
        ) : (
          "Think"
        )}
      </button>
    </div>
  );
}

interface ModelMenuContentsProps {
  availableEfforts: { id: AgentEffort; label: string }[];
  canReason: boolean;
  hasActiveSubscription: boolean;
  isModelAllowed: (model: ModelDef) => boolean;
  selectEffort: (effort: AgentEffort) => void;
  selectModel: (id: string) => void;
  settings: ReturnType<typeof useModelPickerState>["settings"];
  toggleReasoning: () => void;
}

function ModelMenuContents({
  availableEfforts,
  canReason,
  hasActiveSubscription,
  isModelAllowed,
  selectEffort,
  selectModel,
  settings,
  toggleReasoning,
}: ModelMenuContentsProps) {
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel className="text-xs text-muted-foreground">Model</DropdownMenuLabel>
        {MODELS.map((m) => {
          const allowed = isModelAllowed(m);
          return (
            <DropdownMenuItem
              key={m.id}
              className={cn(
                "flex items-center justify-between text-sm",
                !allowed && "cursor-not-allowed opacity-50",
              )}
              disabled={!allowed}
              onClick={() => selectModel(m.id)}
            >
              <span className="flex items-center gap-2">
                {m.label}
                {!allowed && (
                  <span className="rounded-sm bg-primary/10 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    Pro
                  </span>
                )}
              </span>
              {settings.model === m.id && (
                <HugeiconsIcon
                  className="size-3.5 text-primary"
                  icon={Tick02Icon}
                  strokeWidth={2}
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem
          className={cn(
            "flex items-center justify-between text-sm",
            !canReason && "cursor-not-allowed opacity-40",
          )}
          disabled={!canReason}
          onClick={toggleReasoning}
        >
          <span className="flex items-center gap-2">
            <HugeiconsIcon className="size-3.5" icon={SparklesIcon} strokeWidth={2} />
            Extended thinking
            {!hasActiveSubscription && (
              <span className="rounded-sm bg-primary/10 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                Pro
              </span>
            )}
          </span>
          {settings.reasoning && canReason && (
            <HugeiconsIcon className="size-3.5 text-primary" icon={Tick02Icon} strokeWidth={2} />
          )}
        </DropdownMenuItem>
        {settings.reasoning && canReason && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Effort</DropdownMenuLabel>
            {availableEfforts.map((e) => (
              <DropdownMenuItem
                key={e.id}
                className="flex items-center justify-between pl-7 text-sm"
                onClick={() => selectEffort(e.id)}
              >
                {e.label}
                {settings.effort === e.id && (
                  <HugeiconsIcon
                    className="size-3.5 text-primary"
                    icon={Tick02Icon}
                    strokeWidth={2}
                  />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuGroup>
    </>
  );
}

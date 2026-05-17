import { CobaltSelectPopover } from "@cobalt-web/ui/cobalt/select-popover";
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

/** All current models are served by Anthropic via the Vercel AI Gateway. */
function ProviderLogo({ className }: { className?: string }) {
  return (
    <img
      alt=""
      aria-hidden
      className={cn("size-4 shrink-0", className)}
      src="/landing/agents/Claude_AI_symbol.svg"
    />
  );
}

function ProBadge() {
  return (
    <span className="rounded-sm bg-primary/10 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
      Pro
    </span>
  );
}

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

/** Reasoning toggle + effort sub-list, rendered in the select-popover footer. */
function ReasoningFooter({ state }: { state: ReturnType<typeof useModelPickerState> }) {
  const {
    availableEfforts,
    canReason,
    hasActiveSubscription,
    selectEffort,
    settings,
    toggleReasoning,
  } = state;

  return (
    <div>
      <button
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40",
          !canReason && "cursor-not-allowed opacity-50 hover:bg-transparent",
        )}
        disabled={!canReason}
        onClick={toggleReasoning}
        type="button"
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          <HugeiconsIcon className="size-4" icon={SparklesIcon} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 truncate">Extended thinking</span>
        {!hasActiveSubscription && <ProBadge />}
        {settings.reasoning && canReason && (
          <HugeiconsIcon className="size-4 text-primary" icon={Tick02Icon} strokeWidth={2} />
        )}
      </button>
      {settings.reasoning && canReason && (
        <div className="mt-0.5">
          <div className="px-2.5 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">Effort</div>
          {availableEfforts.map((e) => (
            <button
              className="flex w-full items-center gap-2 rounded-md py-1.5 pr-2.5 pl-9 text-left text-sm transition-colors hover:bg-input/40"
              key={e.id}
              onClick={() => selectEffort(e.id)}
              type="button"
            >
              <span className="min-w-0 flex-1 truncate">{e.label}</span>
              {settings.effort === e.id && (
                <HugeiconsIcon className="size-4 text-primary" icon={Tick02Icon} strokeWidth={2} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ModelPickerProps {
  isStreaming: boolean;
}

function ModelSelect({ isStreaming, trigger }: ModelPickerProps & { trigger: React.ReactElement }) {
  const state = useModelPickerState();

  return (
    <CobaltSelectPopover<ModelDef>
      contentClassName="w-auto min-w-56"
      footer={<ReasoningFooter state={state} />}
      itemKey={(m) => m.id}
      itemMatch={(m, q) => m.label.toLowerCase().includes(q)}
      items={MODELS}
      onSelect={(m) => {
        if (!isStreaming) {
          state.selectModel(m.id);
        }
      }}
      renderIcon={() => <ProviderLogo />}
      renderLabel={(m) => (
        <>
          <span className="min-w-0 flex-1 truncate">{m.label}</span>
          {!state.isModelAllowed(m) && <ProBadge />}
        </>
      )}
      searchPlaceholder="Search models…"
      selectedKey={state.currentModel?.id ?? null}
      trigger={trigger}
    />
  );
}

/** Compact single-chip dropdown for the collapsed pill input. */
export function ModelChip({ isStreaming }: ModelPickerProps) {
  const { canReason, currentModel, settings } = useModelPickerState();

  return (
    <ModelSelect
      isStreaming={isStreaming}
      trigger={
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
            isStreaming && "pointer-events-none opacity-50",
          )}
          disabled={isStreaming}
          type="button"
        >
          <ProviderLogo className="size-3.5" />
          {currentModel?.shortLabel}
          {settings.reasoning && canReason && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <HugeiconsIcon className="size-3 text-primary" icon={SparklesIcon} strokeWidth={2} />
              <span className="capitalize text-primary">{settings.effort}</span>
            </>
          )}
          <HugeiconsIcon className="size-3" icon={ArrowDown01Icon} strokeWidth={2} />
        </button>
      }
    />
  );
}

/** Expanded toolbar version for the open input. */
export function ModelPicker({ isStreaming }: ModelPickerProps) {
  const { canReason, currentModel, settings } = useModelPickerState();

  return (
    <ModelSelect
      isStreaming={isStreaming}
      trigger={
        <button
          className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          disabled={isStreaming}
          type="button"
        >
          <ProviderLogo className="size-3.5" />
          {currentModel?.shortLabel}
          {settings.reasoning && canReason && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <HugeiconsIcon className="size-3 text-primary" icon={SparklesIcon} strokeWidth={2} />
              <span className="capitalize text-primary">{settings.effort}</span>
            </>
          )}
          <HugeiconsIcon className="size-3" icon={ArrowDown01Icon} strokeWidth={2} />
        </button>
      }
    />
  );
}

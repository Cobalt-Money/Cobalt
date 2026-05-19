import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type AgentEffort = "low" | "medium" | "high" | "max";

export interface AgentSettings {
  effort: AgentEffort;
  model: string;
  reasoning: boolean;
}

const DEFAULT_SETTINGS: AgentSettings = {
  effort: "high",
  model: "anthropic/claude-opus-4.7",
  reasoning: false,
};

const SETTINGS_KEY = "cobalt-chat-settings";
const REASONING_MODEL_SUFFIX = "+reasoning";

/** Gateway model id must not include our synthetic `+reasoning` suffix (that flag lives in `settings.reasoning`). */
export function normalizeGatewayModelId(modelId: string): string {
  let id = modelId;
  while (id.endsWith(REASONING_MODEL_SUFFIX)) {
    id = id.slice(0, -REASONING_MODEL_SUFFIX.length);
  }
  return id;
}

function loadSettings(): AgentSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AgentSettings>;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        model: normalizeGatewayModelId(parsed.model ?? DEFAULT_SETTINGS.model),
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: AgentSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

interface AgentSettingsContextValue {
  settings: AgentSettings;
  setSettings: (patch: Partial<AgentSettings>) => void;
}

const AgentSettingsContext = createContext<AgentSettingsContextValue | null>(null);

export function useAgentSettings(): AgentSettingsContextValue {
  const ctx = useContext(AgentSettingsContext);
  if (!ctx) {
    throw new Error("useAgentSettings must be used within AgentSettingsProvider");
  }
  return ctx;
}

export function AgentSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AgentSettings>(loadSettings);

  const setSettings = useCallback((patch: Partial<AgentSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      if (typeof patch.model === "string") {
        next.model = normalizeGatewayModelId(patch.model);
      }
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ setSettings, settings }), [setSettings, settings]);

  return <AgentSettingsContext.Provider value={value}>{children}</AgentSettingsContext.Provider>;
}

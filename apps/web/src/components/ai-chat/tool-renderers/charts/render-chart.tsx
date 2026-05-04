import type { Spec } from "@json-render/core";
import { ActionProvider, DataProvider, Renderer, VisibilityProvider } from "@json-render/react";

import { ToolErrorCard, ToolLoadingSkeleton } from "../shared";
import type { ToolRendererContext } from "../types";
import { toolRendererKey } from "../types";
import { chartRegistry } from "./chart-registry";

interface ChartInvocation {
  type: "tool-renderChart";
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

function isChartSpec(
  output: unknown,
): output is { root: string; elements: Record<string, unknown> } {
  return (
    typeof output === "object" &&
    output !== null &&
    "root" in output &&
    "elements" in output &&
    typeof (output as { root: unknown }).root === "string" &&
    typeof (output as { elements: unknown }).elements === "object"
  );
}

export function RenderChartToolRenderer({
  invocation: part,
  context,
}: {
  invocation: ChartInvocation;
  context: ToolRendererContext;
}) {
  if (part.state === "output-available" && part.output && isChartSpec(part.output)) {
    return (
      <div key={toolRendererKey(context, "chart")} className="pb-4">
        <DataProvider initialData={{}}>
          <VisibilityProvider>
            <ActionProvider handlers={{}}>
              <Renderer registry={chartRegistry} spec={part.output as Spec} />
            </ActionProvider>
          </VisibilityProvider>
        </DataProvider>
      </div>
    );
  }
  if (part.state === "input-available" || part.state === "input-streaming") {
    return <ToolLoadingSkeleton context={context} />;
  }
  if (part.state === "output-error") {
    return (
      <ToolErrorCard
        context={context}
        errorText={part.errorText}
        suffix="chart-error"
        title="Failed to render chart"
      />
    );
  }
  return null;
}

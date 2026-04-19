import { render as katexRender } from "katex";
import { useEffect, useRef } from "react";

import "katex/dist/katex.min.css";
import { ToolErrorCard, ToolLoadingSkeleton } from "../shared";
import type { ToolRendererContext } from "../types";
import { toolRendererKey } from "../types";

interface MathComputationOutput {
  operation?: string;
  expression: string;
  expressionLatex?: string;
  variables?: Record<string, number>;
  result: string | number;
  formula?: string;
  description?: string;
  executedAt?: string;
}

interface ComputeInvocation {
  type: "tool-compute";
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

function extractData(output: unknown): MathComputationOutput | null {
  if (typeof output !== "object" || output === null) {
    return null;
  }
  const o = output as Record<string, unknown>;
  if (typeof o.expression !== "string") {
    return null;
  }
  return {
    description: typeof o.description === "string" ? o.description : undefined,
    executedAt: typeof o.executedAt === "string" ? o.executedAt : undefined,
    expression: o.expression,
    expressionLatex:
      typeof o.expressionLatex === "string" ? o.expressionLatex : undefined,
    formula: typeof o.formula === "string" ? o.formula : undefined,
    operation: typeof o.operation === "string" ? o.operation : undefined,
    result: o.result as string | number,
    variables:
      o.variables &&
      typeof o.variables === "object" &&
      !Array.isArray(o.variables)
        ? (o.variables as Record<string, number>)
        : undefined,
  };
}

function formatResult(result: string | number): string {
  if (typeof result === "number") {
    if (Number.isInteger(result)) {
      return result.toString();
    }
    return (Math.round(result * 1_000_000) / 1_000_000)
      .toString()
      .replace(/\.?0+$/, "");
  }
  return String(result);
}

function MathComputationDisplay({ data }: { data: MathComputationOutput }) {
  const expressionRef = useRef<HTMLDivElement>(null);
  const resultStr = formatResult(data.result);
  const displayFormula = data.formula ?? `${data.expression} = ${resultStr}`;
  const formulaLatex = data.expressionLatex
    ? `${data.expressionLatex} = ${resultStr}`
    : displayFormula;
  const hasVariables = data.variables && Object.keys(data.variables).length > 0;

  useEffect(() => {
    const el = expressionRef.current;
    if (!el) {
      return;
    }
    try {
      katexRender(formulaLatex, el, {
        displayMode: true,
        output: "html",
        throwOnError: false,
      });
      if (el.innerHTML.trim() === "") {
        el.textContent = displayFormula;
      }
    } catch {
      el.textContent = displayFormula;
    }
  }, [formulaLatex, displayFormula]);

  return (
    <div className="space-y-4 py-4">
      {data.description && (
        <div className="text-sm text-muted-foreground mb-2">
          {data.description}
        </div>
      )}
      {hasVariables && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            Variables
          </div>
          <div className="text-sm font-mono">
            {Object.entries(data.variables ?? {})
              .map(([k, v]) => `${k} = ${v}`)
              .join(", ")}
          </div>
        </div>
      )}
      <div className="space-y-2 py-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          Expression
        </div>
        <div
          ref={expressionRef}
          className="text-xl font-medium overflow-x-auto py-2 min-h-[3rem] [&_.katex]:text-primary"
        />
      </div>
      <div className="space-y-2 pt-2 border-t">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          Result
        </div>
        <div className="text-2xl font-bold text-foreground">{resultStr}</div>
      </div>
    </div>
  );
}

export function MathComputationToolRenderer({
  invocation: part,
  context,
}: {
  invocation: ComputeInvocation;
  context: ToolRendererContext;
}) {
  if (part.state === "output-available" && part.output) {
    const data = extractData(part.output);
    if (!data) {
      return null;
    }
    return (
      <div key={toolRendererKey(context, "math-computation")} className="pb-4">
        <MathComputationDisplay data={data} />
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
        suffix="math-computation-error"
        title="Computation failed"
      />
    );
  }
  return null;
}

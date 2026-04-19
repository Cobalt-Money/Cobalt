import { CodeBlock } from "@cobalt-web/ui/components/ai-elements/code-block";
import {
  Sandbox,
  SandboxContent,
  SandboxHeader,
  SandboxTabContent,
  SandboxTabs,
  SandboxTabsList,
  SandboxTabsTrigger,
} from "@cobalt-web/ui/components/ai-elements/sandbox";
import {
  StackTrace,
  StackTraceContent,
  StackTraceError,
  StackTraceErrorMessage,
  StackTraceErrorType,
  StackTraceFrames,
  StackTraceHeader,
} from "@cobalt-web/ui/components/ai-elements/stack-trace";
import type { ToolUIPart } from "ai";

import type { ToolRendererContext } from "../types";
import { toolRendererKey } from "../types";

interface SqlInvocation {
  type: "tool-runSql";
  toolCallId: string;
  state: ToolUIPart["state"];
  input?: { query?: string };
  output?: { rows?: unknown[] };
  errorText?: string;
}

export function SqlToolRenderer({
  invocation,
  context,
}: {
  invocation: SqlInvocation;
  context: ToolRendererContext;
}) {
  const query = invocation.input?.query ?? "";
  const rows =
    invocation.state === "output-available"
      ? (invocation.output?.rows ?? [])
      : [];
  const err = invocation.state === "output-error" ? invocation.errorText : null;
  const hasError = Boolean(err);

  return (
    <div key={toolRendererKey(context, "sql")} className="pb-2">
      <Sandbox defaultOpen>
        <SandboxHeader state={invocation.state} title="SQL" />
        <SandboxContent>
          <SandboxTabs defaultValue={hasError ? "error" : "query"}>
            <SandboxTabsList>
              <SandboxTabsTrigger value="query">Query</SandboxTabsTrigger>
              <SandboxTabsTrigger value="results">Results</SandboxTabsTrigger>
              {hasError && (
                <SandboxTabsTrigger value="error">Error</SandboxTabsTrigger>
              )}
            </SandboxTabsList>
            <SandboxTabContent value="query">
              <CodeBlock code={query} language="sql" showLineNumbers />
            </SandboxTabContent>
            <SandboxTabContent value="results">
              <CodeBlock
                code={JSON.stringify(rows, null, 2)}
                language="json"
                showLineNumbers
              />
            </SandboxTabContent>
            {hasError && (
              <SandboxTabContent value="error">
                <StackTrace defaultOpen trace={err ?? ""}>
                  <StackTraceHeader>
                    <StackTraceError>
                      <StackTraceErrorType>Error</StackTraceErrorType>
                      <StackTraceErrorMessage>{err}</StackTraceErrorMessage>
                    </StackTraceError>
                  </StackTraceHeader>
                  <StackTraceContent>
                    <StackTraceFrames />
                  </StackTraceContent>
                </StackTrace>
              </SandboxTabContent>
            )}
          </SandboxTabs>
        </SandboxContent>
      </Sandbox>
    </div>
  );
}

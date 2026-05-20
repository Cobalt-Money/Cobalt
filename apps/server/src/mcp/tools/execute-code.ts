import { runCobaltCode } from "../../ai/agents/finance-agent/code-runtime.js";

export async function executeCode(
  userId: string,
  code: string,
  grantedScopes: string[],
): Promise<{ content: { text: string; type: "text" }[]; isError?: boolean }> {
  const result = await runCobaltCode(userId, code, grantedScopes);

  if (!result.ok) {
    return {
      content: [
        {
          text: JSON.stringify(
            {
              error: result.error ?? { message: "code failed", name: "Error" },
              stdout: result.stdout,
            },
            null,
            2,
          ),
          type: "text" as const,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [{ text: result.stdout, type: "text" as const }],
  };
}

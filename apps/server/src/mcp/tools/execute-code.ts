import { runUserCode } from "../services/sandbox-runner.js";

const MAX_OUTPUT_CHARS = 25_000;

function truncate(s: string): string {
  if (s.length <= MAX_OUTPUT_CHARS) {
    return s;
  }
  return `${s.slice(0, MAX_OUTPUT_CHARS)}\n…[truncated ${String(s.length - MAX_OUTPUT_CHARS)} chars]`;
}

export async function executeCode(
  userId: string,
  code: string
): Promise<{ content: { text: string; type: "text" }[]; isError?: boolean }> {
  const result = await runUserCode(userId, code);

  if (!result.ok) {
    return {
      content: [
        {
          text: JSON.stringify(
            {
              error: result.error ?? "code failed",
              exitCode: result.exitCode,
              stdout: truncate(result.stdout),
            },
            null,
            2
          ),
          type: "text" as const,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [{ text: truncate(result.stdout), type: "text" as const }],
  };
}

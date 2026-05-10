import { generateText, stepCountIs, tool } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { MUTATING_COMMAND_RE, composeFinanceAgentInstructions } from "./finance-agent.js";
import type { FinanceAgentCallOptions } from "./finance-agent.js";

// Re-derive the result type from MockLanguageModelV3's constructor signature
// since `@ai-sdk/provider` is not a direct dependency.
type LanguageModelV3GenerateResult = Exclude<
  ConstructorParameters<typeof MockLanguageModelV3>[0],
  undefined
>["doGenerate"] extends ((...args: never[]) => infer R) | (infer R) | (infer R)[] | undefined
  ? Awaited<R>
  : never;

describe("MUTATING_COMMAND_RE", () => {
  describe("blocks destructive commands", () => {
    it.each([
      ["rm -rf /tmp/x"],
      ["mv a b"],
      ["cp a b"],
      ["touch f"],
      ["mkdir d"],
      ["rmdir d"],
      ["ln -s a b"],
      ["chmod 777 f"],
      ["chown user f"],
      ["dd if=/dev/zero of=f"],
      ["sed -i s/a/b/ f"],
      ["install -m 755 a b"],
      ["truncate -s 0 f"],
      ["shred f"],
    ])("blocks: %s", (cmd) => {
      expect(MUTATING_COMMAND_RE.test(cmd)).toBeTruthy();
    });

    it("blocks destructive command after a separator", () => {
      expect(MUTATING_COMMAND_RE.test("ls && rm f")).toBeTruthy();
      expect(MUTATING_COMMAND_RE.test("ls; rm f")).toBeTruthy();
      expect(MUTATING_COMMAND_RE.test("ls | xargs rm")).toBeTruthy();
    });
  });

  describe("blocks output redirection", () => {
    it.each([["echo x > f"], ["echo x >> f"], ["cat a | tee b"]])("blocks: %s", (cmd) => {
      expect(MUTATING_COMMAND_RE.test(cmd)).toBeTruthy();
    });

    it("allows redirection to /dev/null", () => {
      expect(MUTATING_COMMAND_RE.test("noisy 2>/dev/null")).toBeFalsy();
      expect(MUTATING_COMMAND_RE.test("noisy >/dev/null")).toBeFalsy();
    });

    it("allows fd duplication (>&)", () => {
      expect(MUTATING_COMMAND_RE.test("cmd 2>&1")).toBeFalsy();
    });
  });

  describe("allows read-only commands", () => {
    it.each([
      ["ls"],
      ["ls -la /workspace"],
      ["cat README.md"],
      ["grep -r foo ."],
      ["find . -name '*.ts'"],
      ["head -n 10 f"],
      ["wc -l f"],
      ["echo hello"],
    ])("allows: %s", (cmd) => {
      expect(MUTATING_COMMAND_RE.test(cmd)).toBeFalsy();
    });
  });

  describe("substring safety", () => {
    it("does not block when destructive verb appears inside a word", () => {
      expect(MUTATING_COMMAND_RE.test("echo charm")).toBeFalsy();
      expect(MUTATING_COMMAND_RE.test("echo movement")).toBeFalsy();
      expect(MUTATING_COMMAND_RE.test("ls firmware")).toBeFalsy();
    });
  });
});

describe("composeFinanceAgentInstructions", () => {
  const baseOptions: FinanceAgentCallOptions = {
    currentDate: "2026-05-10",
    currentDateFormatted: "May 10, 2026",
  };

  it("appends the formatted date sentence", () => {
    const out = composeFinanceAgentInstructions("BASE", baseOptions, "TOC", "CHART", "DOC");
    expect(out).toContain("Today is May 10, 2026 (2026-05-10).");
  });

  it("includes knowledge TOC, chart prompt, and document prompt sections", () => {
    const out = composeFinanceAgentInstructions(
      "BASE",
      baseOptions,
      "KNOWLEDGE_TOC_MARKER",
      "CHART_PROMPT_MARKER",
      "DOCUMENT_PROMPT_MARKER",
    );
    expect(out).toContain("KNOWLEDGE_TOC_MARKER");
    expect(out).toContain("CHART_PROMPT_MARKER");
    expect(out).toContain("DOCUMENT_PROMPT_MARKER");
  });

  it("preserves the base instructions at the top", () => {
    const out = composeFinanceAgentInstructions(
      "BASE_INSTRUCTIONS_MARKER",
      baseOptions,
      "TOC",
      "CHART",
      "DOC",
    );
    expect(out.startsWith("BASE_INSTRUCTIONS_MARKER")).toBeTruthy();
  });

  describe("emoji rule", () => {
    it("tells the model to avoid emojis unless the user asks", () => {
      const out = composeFinanceAgentInstructions("BASE", baseOptions, "TOC", "CHART", "DOC");
      expect(out).toContain("Only use emojis if the user explicitly requests it");
    });
  });
});

/**
 * Demonstrate the MockLanguageModelV3 pattern. These tests show how to drive
 * AI SDK code paths without making any real network calls — the mock model is
 * a plain JS object that returns canned responses. Use this pattern when
 * testing prompt construction, tool dispatch, and step-loop semantics.
 */
describe("MockLanguageModelV3 demo (no inference)", () => {
  it("captures the prompt the agent sent (prompt-regression pattern)", async () => {
    let capturedSystem: string | undefined;

    const model = new MockLanguageModelV3({
      doGenerate: ({ prompt }): Promise<LanguageModelV3GenerateResult> => {
        const sys = prompt.find((m) => m.role === "system");
        capturedSystem = sys?.content;
        return Promise.resolve({
          content: [{ text: "ok", type: "text" }],
          finishReason: { raw: "stop", unified: "stop" } as const,
          usage: {
            inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 1, total: 1 },
            outputTokens: { reasoning: 0, text: 1, total: 1 },
          },
          warnings: [],
        });
      },
    });

    await generateText({
      model,
      prompt: "hello",
      system: "SENTINEL_SYSTEM_PROMPT",
    });

    expect(capturedSystem).toBe("SENTINEL_SYSTEM_PROMPT");
  });

  it("scripts a multi-turn tool loop and verifies termination (state-machine pattern)", async () => {
    let toolCallCount = 0;
    let turn = 0;

    const fakeReadFile = tool({
      description: "fake",
      execute: () => {
        toolCallCount += 1;
        return Promise.resolve("file contents");
      },
      inputSchema: z.object({ path: z.string() }),
    });

    const model = new MockLanguageModelV3({
      doGenerate: (): Promise<LanguageModelV3GenerateResult> => {
        turn += 1;
        if (turn === 1) {
          return Promise.resolve({
            content: [
              {
                input: '{"path":"x.ts"}',
                toolCallId: "1",
                toolName: "read_file",
                type: "tool-call" as const,
              },
            ],
            finishReason: { raw: "tool_use", unified: "tool-calls" } as const,
            usage: {
              inputTokens: {
                cacheRead: 0,
                cacheWrite: 0,
                noCache: 1,
                total: 1,
              },
              outputTokens: { reasoning: 0, text: 1, total: 1 },
            },
            warnings: [],
          });
        }
        return Promise.resolve({
          content: [{ text: "done", type: "text" }],
          finishReason: { raw: "stop", unified: "stop" } as const,
          usage: {
            inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 1, total: 1 },
            outputTokens: { reasoning: 0, text: 1, total: 1 },
          },
          warnings: [],
        });
      },
    });

    const result = await generateText({
      model,
      prompt: "read x.ts",
      stopWhen: stepCountIs(5),
      tools: { read_file: fakeReadFile },
    });

    expect(toolCallCount).toBe(1);
    expect(turn).toBe(2);
    expect(result.text).toBe("done");
  });

  it("respects stepCountIs by terminating runaway loops", async () => {
    const fakeTool = tool({
      description: "fake",
      execute: () => Promise.resolve("result"),
      inputSchema: z.object({}),
    });

    let turn = 0;
    const model = new MockLanguageModelV3({
      doGenerate: (): Promise<LanguageModelV3GenerateResult> => {
        turn += 1;
        return Promise.resolve({
          content: [
            {
              input: "{}",
              toolCallId: String(turn),
              toolName: "fake",
              type: "tool-call",
            },
          ],
          finishReason: { raw: "tool_use", unified: "tool-calls" } as const,
          usage: {
            inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 1, total: 1 },
            outputTokens: { reasoning: 0, text: 1, total: 1 },
          },
          warnings: [],
        });
      },
    });

    await generateText({
      model,
      prompt: "loop",
      stopWhen: stepCountIs(3),
      tools: { fake: fakeTool },
    });

    expect(turn).toBeLessThanOrEqual(3);
  });
});

import type { ProcessedArticle } from "@cobalt-web/server-data/news/events/lib";
import { generateText } from "ai";
import { beforeEach, vi } from "vitest";

import { summarizeEventArticles, TransientSummaryError } from "./financial-events-summary-agent.js";

// System-boundary mock: the `ai` SDK's `generateText`. `vi.mock` is hoisted
// above the imports at compile time, so we can author it below them cleanly.
// `importActual` keeps `NoObjectGeneratedError.isInstance` working.
vi.mock(import("ai"), async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

const mockGenerateText = vi.mocked(generateText);

// Build a plausible ProcessedArticle — the agent uses the content, source, and
// title to build the prompt; everything else is ignored.
function processedArticle(overrides: Partial<ProcessedArticle> = {}): ProcessedArticle {
  return {
    extractedContent: {
      text: "Article body text here",
      title: "Example headline",
    },
    originalArticle: {
      date: "2026-04-10",
      image_url: "https://e.com/i.png",
      news_url: "https://e.com/a",
      sentiment: "neutral",
      source_name: "Reuters",
      text: "",
      tickers: ["NVDA"],
      title: "Example headline",
      topics: [],
      type: "Article",
    },
    processingMetadata: {
      contentLength: 22,
      extractionTime: 100,
      processedAt: new Date(),
      success: true,
    },
    ...overrides,
  };
}

// Shape of the mocked return value — mirrors the real `generateText` return,
// but only the fields the agent reads need real content.
function validAiOutput() {
  return {
    finishReason: "stop",
    output: {
      eventSummary:
        "## Headline\n\nFirst paragraph with cite [1](#cite-1).\n\n## Aftermath\n\nMore prose [1](#cite-1)[2](#cite-2).",
      keyPoints: [],
      overallSentiment: "neutral" as const,
      topics: ["tech"] as const,
    },
    text: "",
    usage: { completionTokens: 0, promptTokens: 0, totalTokens: 0 },
  };
}

describe("summarizeEventArticles", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it("returns a structured EventSummary when the model produces valid output", async () => {
    mockGenerateText.mockResolvedValueOnce(
      validAiOutput() as unknown as Awaited<ReturnType<typeof generateText>>,
    );

    const result = await summarizeEventArticles("NVIDIA earnings", undefined, [processedArticle()]);

    expect(result.eventSummary).toContain("## Headline");
    expect(result.eventSummary).toContain("[1](#cite-1)");
    expect(result.keyPoints).toStrictEqual([]);
    expect(result.overallSentiment).toBe("neutral");
    expect(result.topics).toStrictEqual(["tech"]);
    expect(result.articleCount).toBe(1);
    expect(result.processingMetadata.success).toBeTruthy();
  });

  it("throws synchronously when no articles are provided", async () => {
    await expect(summarizeEventArticles("empty event", undefined, [])).rejects.toThrow(
      "No articles to summarize",
    );
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("throws TransientSummaryError when the model returns undefined output", async () => {
    mockGenerateText.mockResolvedValueOnce({
      ...validAiOutput(),
      output: undefined,
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    await expect(
      summarizeEventArticles("x", undefined, [processedArticle()]),
    ).rejects.toBeInstanceOf(TransientSummaryError);
  });

  it("translates schema-validation failures into TransientSummaryError so the step retries", async () => {
    // Uses the message-pattern branch of the agent's classifier (the other
    // branch uses AI SDK's `NoObjectGeneratedError.isInstance`, whose
    // constructor shape is an implementation detail we don't want to couple to).
    mockGenerateText.mockRejectedValueOnce(new Error("AI generation did not match schema"));

    const thrown = await summarizeEventArticles("x", undefined, [processedArticle()]).catch(
      (error) => error as unknown,
    );

    expect(thrown).toBeInstanceOf(TransientSummaryError);
    expect((thrown as Error).message).toContain("AI output error");
  });

  it("translates rate-limit errors into TransientSummaryError", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("Gateway returned: rate limit exceeded"));

    const thrown = await summarizeEventArticles("x", undefined, [processedArticle()]).catch(
      (error) => error as unknown,
    );

    expect(thrown).toBeInstanceOf(TransientSummaryError);
    expect((thrown as Error).message).toContain("Transient error");
  });

  it("returns a failed-result summary (not a throw) for non-transient unknown errors", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("Bizarre programming error"));

    const result = await summarizeEventArticles("x", undefined, [processedArticle()]);

    expect(result.processingMetadata.success).toBeFalsy();
    expect(result.processingMetadata.error).toBe("Bizarre programming error");
    expect(result.eventSummary).toBe("Event summary generation failed");
    expect(result.topics).toStrictEqual(["other"]);
  });
});

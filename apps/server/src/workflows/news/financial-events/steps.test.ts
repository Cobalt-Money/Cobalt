import type {
  EventSummary,
  ProcessedArticle,
} from "@cobalt-web/server-data/news/events/lib";
import { beforeEach, vi } from "vitest";
import { getStepMetadata, RetryableError } from "workflow";

import {
  summarizeEventArticles,
  TransientSummaryError,
} from "../../../ai/agents/financial-events-summary/financial-events-summary-agent.js";
import { summarizeEventStep } from "./steps.js";

// Mock the workflow runtime — `getStepMetadata()` is only available inside the
// workflow executor, so tests stub it. `RetryableError` / `FatalError` stay
// real so `instanceof` checks still work.
vi.mock(import("workflow"), async () => {
  const actual = await vi.importActual<typeof import("workflow")>("workflow");
  return {
    ...actual,
    getStepMetadata: vi.fn(),
  };
});

// Mock the agent so the step test doesn't actually call the AI Gateway.
// `importActual` keeps `TransientSummaryError` real so `instanceof` matches.
vi.mock(
  import("../../../ai/agents/financial-events-summary/financial-events-summary-agent.js"),
  async () => {
    const actual = await vi.importActual<
      typeof import("../../../ai/agents/financial-events-summary/financial-events-summary-agent.js")
    >(
      "../../../ai/agents/financial-events-summary/financial-events-summary-agent.js"
    );
    return {
      ...actual,
      summarizeEventArticles: vi.fn(),
    };
  }
);

const mockSummarize = vi.mocked(summarizeEventArticles);
const mockGetStepMetadata = vi.mocked(getStepMetadata);

const dummySummary: EventSummary = {
  articleCount: 1,
  eventSummary: "s",
  keyPoints: ["a", "b", "c", "d"],
  overallSentiment: "neutral",
  processingMetadata: {
    model: "google/gemini-2.5-flash",
    processingTime: 0,
    success: true,
    summarizedAt: new Date(),
  },
  topics: ["tech"],
};

function scraped(): ProcessedArticle[] {
  return [
    {
      extractedContent: { text: "body", title: "t" },
      originalArticle: {
        date: "2026-04-10",
        news_url: "https://e.com/a",
        sentiment: "neutral",
        source_name: "Reuters",
        text: "",
        tickers: [],
        title: "t",
        topics: [],
        type: "Article",
      },
      processingMetadata: {
        contentLength: 4,
        extractionTime: 0,
        processedAt: new Date(),
        success: true,
      },
    },
  ];
}

// `RetryableError` normalizes a numeric `retryAfter` into a `Date` (now + ms).
// Tests assert on the delay, not the absolute instant.
function delayMs(err: RetryableError): number {
  const retryAt = err.retryAfter;
  if (retryAt instanceof Date) {
    return retryAt.getTime() - Date.now();
  }
  if (typeof retryAt === "number") {
    return retryAt;
  }
  throw new Error(`Unexpected retryAfter type: ${typeof retryAt}`);
}

describe("summarizeEventStep", () => {
  beforeEach(() => {
    mockSummarize.mockReset();
    mockGetStepMetadata.mockReset();
    mockGetStepMetadata.mockReturnValue({ attempt: 1 } as unknown as ReturnType<
      typeof getStepMetadata
    >);
  });

  it("returns the agent's summary on success", async () => {
    mockSummarize.mockResolvedValueOnce(dummySummary);

    const result = await summarizeEventStep(
      "NVIDIA earnings",
      undefined,
      scraped()
    );

    expect(result).toBe(dummySummary);
  });

  it("translates TransientSummaryError into a RetryableError with exponential backoff (attempt=1 → ~1000ms)", async () => {
    mockSummarize.mockRejectedValueOnce(
      new TransientSummaryError("schema mismatch")
    );
    mockGetStepMetadata.mockReturnValue({ attempt: 1 } as unknown as ReturnType<
      typeof getStepMetadata
    >);

    const thrown = await summarizeEventStep("x", undefined, scraped()).catch(
      (error) => error as unknown
    );

    expect(thrown).toBeInstanceOf(RetryableError);
    expect(delayMs(thrown as RetryableError)).toBeGreaterThan(900);
    expect(delayMs(thrown as RetryableError)).toBeLessThanOrEqual(1000);
  });

  it("uses attempt-squared backoff: attempt=3 yields ~9000ms, attempt=5 yields ~25000ms", async () => {
    mockSummarize.mockRejectedValue(new TransientSummaryError("still broken"));

    mockGetStepMetadata.mockReturnValueOnce({
      attempt: 3,
    } as unknown as ReturnType<typeof getStepMetadata>);
    const result3 = (await summarizeEventStep("x", undefined, scraped()).catch(
      (error) => error as unknown
    )) as RetryableError;
    expect(delayMs(result3)).toBeGreaterThan(8900);
    expect(delayMs(result3)).toBeLessThanOrEqual(9000);

    mockGetStepMetadata.mockReturnValueOnce({
      attempt: 5,
    } as unknown as ReturnType<typeof getStepMetadata>);
    const result5 = (await summarizeEventStep("x", undefined, scraped()).catch(
      (error) => error as unknown
    )) as RetryableError;
    expect(delayMs(result5)).toBeGreaterThan(24_900);
    expect(delayMs(result5)).toBeLessThanOrEqual(25_000);
  });

  it("rethrows non-transient errors unchanged (no retry wrap)", async () => {
    const other = new Error("programmer error");
    mockSummarize.mockRejectedValueOnce(other);

    const thrown = await summarizeEventStep("x", undefined, scraped()).catch(
      (error) => error as unknown
    );

    expect(thrown).toBe(other);
    expect(thrown).not.toBeInstanceOf(RetryableError);
  });
});

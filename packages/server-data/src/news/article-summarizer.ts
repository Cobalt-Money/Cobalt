import { generateText, Output } from "ai";
import { RetryableError } from "workflow";
import { z } from "zod";

import type { ProcessedArticle } from "./article-processor";

const summarySchema = z.object({
  eventSummary: z.string(),
  keyPoints: z.array(z.string()),
  overallSentiment: z.enum(["positive", "negative", "neutral", "mixed"]),
  topics: z.array(
    z.enum([
      "tech",
      "government",
      "analyst",
      "AI",
      "announcement",
      "leadership",
      "energy",
      "earnings",
      "other",
    ])
  ),
});

export const ArticleSummarizer = {
  async summarizeAllArticles(
    articles: ProcessedArticle[],
    eventName: string,
    eventText: string | undefined
  ) {
    const articleTexts = articles
      .filter(
        (a) =>
          a.processingMetadata.success && a.extractedContent.text.length > 0
      )
      .map(
        (a) =>
          `Source: ${a.originalArticle.source_name}\nTitle: ${a.extractedContent.title}\n${a.extractedContent.text.slice(0, 2000)}`
      )
      .join("\n\n---\n\n");

    const startTime = Date.now();

    try {
      const result = await generateText({
        model: "vertex/gemini-3-flash",
        output: Output.object({ schema: summarySchema }),
        prompt: `Summarize this financial event:\n\nEvent: ${eventName}\n${eventText ? `Context: ${eventText}\n` : ""}\nArticles:\n${articleTexts}\n\nProvide a concise summary, key points, overall sentiment, and relevant topics.`,
      });

      return {
        ...result.output,
        articleCount: articles.length,
        processingMetadata: {
          model: "vertex/gemini-3-flash",
          processingTime: Date.now() - startTime,
          success: true,
          summarizedAt: new Date(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("did not match schema") ||
        errorMessage.includes("No object generated")
      ) {
        throw new RetryableError(
          `AI model schema validation failed: ${errorMessage}`,
          { retryAfter: "10s" }
        );
      }
      if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        throw new RetryableError("AI model rate limited", { retryAfter: "1m" });
      }
      throw error;
    }
  },
};

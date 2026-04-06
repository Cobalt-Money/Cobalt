import type { StockNewsArticle } from "@cobalt-web/clients/stock-news";

export interface ProcessedArticle {
  originalArticle: StockNewsArticle;
  extractedContent: {
    title: string;
    text: string;
  };
  processingMetadata: {
    processedAt: Date;
    success: boolean;
    error?: string;
    contentLength: number;
    extractionTime: number;
  };
}

export const ArticleProcessor = {
  async processArticle(article: StockNewsArticle): Promise<ProcessedArticle> {
    const startTime = Date.now();

    try {
      const response = await fetch(article.news_url, {
        headers: { "User-Agent": "Cobalt-Financial-News/1.0" },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      // Simple content extraction (placeholder for Mozilla Readability)
      const textContent = html
        .replaceAll(/<[^>]+>/g, " ")
        .replaceAll(/\s+/g, " ")
        .trim();
      const extractionTime = Date.now() - startTime;

      return {
        extractedContent: {
          text: textContent.slice(0, 5000),
          title: article.title,
        },
        originalArticle: article,
        processingMetadata: {
          contentLength: textContent.length,
          extractionTime,
          processedAt: new Date(),
          success: true,
        },
      };
    } catch (error) {
      const extractionTime = Date.now() - startTime;
      return {
        extractedContent: { text: "", title: article.title },
        originalArticle: article,
        processingMetadata: {
          contentLength: 0,
          error: error instanceof Error ? error.message : String(error),
          extractionTime,
          processedAt: new Date(),
          success: false,
        },
      };
    }
  },
};

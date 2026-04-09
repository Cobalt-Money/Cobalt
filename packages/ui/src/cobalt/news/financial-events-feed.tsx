/**
 * Shared types for financial events + article previews (News magazine + hooks).
 */
export interface FinancialEventArticlePreview {
  readonly id: string;
  readonly title: string;
  readonly newsUrl: string;
  readonly sourceName: string | null;
  readonly imageUrl: string | null;
}

export interface FinancialEventCard {
  readonly id: string;
  readonly eventId: string;
  readonly eventName: string;
  readonly eventText: string | null;
  readonly summary: string | null;
  readonly sentiment: string | null;
  readonly date: number | null;
  readonly createdAt: number | null;
  readonly newsItems: number;
  readonly tickers: readonly string[];
  /** Topic tags from `financial_events.topics` (e.g. tech, earnings). */
  readonly topics: readonly string[];
  readonly articles: readonly FinancialEventArticlePreview[];
}

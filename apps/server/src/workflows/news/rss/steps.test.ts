import type { RssFeed } from "@cobalt-web/db/schema/news";
import * as rssActions from "@cobalt-web/server-data/news/rss/actions";
import * as rssMutations from "@cobalt-web/server-data/news/rss/mutations";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RetryableError } from "workflow";

import { listActiveFeedsStep, processFeedStep } from "./steps.js";

vi.mock(import("@cobalt-web/server-data/news/rss/actions"));
vi.mock(import("@cobalt-web/server-data/news/rss/mutations"));

const mockFeed: RssFeed = {
  category: "markets",
  company: "Test Co",
  createdAt: new Date(),
  description: "A test RSS feed",
  fetchIntervalMinutes: "5",
  id: "feed-1",
  isActive: true,
  lastFetched: null,
  name: "Test Feed",
  updatedAt: new Date(),
  url: "https://example.com/rss",
};

describe("listActiveFeedsStep", () => {
  it("returns list of active feeds", async () => {
    const feeds = [mockFeed];
    vi.mocked(rssMutations.listActiveRssFeeds).mockResolvedValue(feeds);

    const result = await listActiveFeedsStep();

    expect(result).toStrictEqual(feeds);
    expect(rssMutations.listActiveRssFeeds).toHaveBeenCalledWith();
  });

  it("handles empty feed list", async () => {
    vi.mocked(rssMutations.listActiveRssFeeds).mockResolvedValue([]);

    const result = await listActiveFeedsStep();

    expect(result).toStrictEqual([]);
  });
});

describe("processFeedStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes feed successfully with new articles", async () => {
    const mockRssData = {
      items: [
        {
          author: "author@example.com",
          categories: [],
          description: "Description 1",
          guid: "guid-1",
          link: "https://example.com/article1",
          pubDate: "Mon, 21 Apr 2026 10:00:00 GMT",
          title: "Article 1",
        },
      ],
      title: "Test Feed",
    };

    vi.mocked(rssActions.fetchRssFeedXml).mockResolvedValue("<rss></rss>");
    vi.mocked(rssActions.parseRssXml).mockReturnValue(mockRssData as never);
    vi.mocked(rssActions.parseDate).mockReturnValue(new Date());
    vi.mocked(rssActions.buildItemMetadata).mockReturnValue(null);
    vi.mocked(rssMutations.upsertRssArticleForFeed).mockResolvedValue({
      alreadyLinked: false,
      inserted: true,
    });
    vi.mocked(rssMutations.markFeedFetched).mockResolvedValue();

    const result = await processFeedStep(mockFeed);

    expect(result).toStrictEqual({
      feedId: mockFeed.id,
      feedName: mockFeed.name,
      newArticles: 1,
      reusedArticles: 0,
      skippedArticles: 0,
      success: true,
    });
    expect(rssMutations.markFeedFetched).toHaveBeenCalledWith(mockFeed.id);
  });

  it("handles reused articles (already in another feed)", async () => {
    const mockRssData = {
      items: [
        {
          guid: "guid-1",
          link: "https://example.com/article1",
          pubDate: "Mon, 21 Apr 2026 10:00:00 GMT",
          title: "Article 1",
        },
      ],
      title: "Test Feed",
    };

    vi.mocked(rssActions.fetchRssFeedXml).mockResolvedValue("<rss></rss>");
    vi.mocked(rssActions.parseRssXml).mockReturnValue(mockRssData as never);
    vi.mocked(rssActions.parseDate).mockReturnValue(new Date());
    vi.mocked(rssActions.buildItemMetadata).mockReturnValue(null);
    vi.mocked(rssMutations.upsertRssArticleForFeed).mockResolvedValue({
      alreadyLinked: false,
      inserted: false, // Article exists but not in this feed
    });
    vi.mocked(rssMutations.markFeedFetched).mockResolvedValue();

    const result = await processFeedStep(mockFeed);

    expect(result).toStrictEqual({
      feedId: mockFeed.id,
      feedName: mockFeed.name,
      newArticles: 0,
      reusedArticles: 1,
      skippedArticles: 0,
      success: true,
    });
  });

  it("handles duplicate articles (already linked to this feed)", async () => {
    const mockRssData = {
      items: [
        {
          guid: "guid-1",
          link: "https://example.com/article1",
          pubDate: "Mon, 21 Apr 2026 10:00:00 GMT",
          title: "Article 1",
        },
      ],
      title: "Test Feed",
    };

    vi.mocked(rssActions.fetchRssFeedXml).mockResolvedValue("<rss></rss>");
    vi.mocked(rssActions.parseRssXml).mockReturnValue(mockRssData as never);
    vi.mocked(rssActions.parseDate).mockReturnValue(new Date());
    vi.mocked(rssActions.buildItemMetadata).mockReturnValue(null);
    vi.mocked(rssMutations.upsertRssArticleForFeed).mockResolvedValue({
      alreadyLinked: true,
      inserted: false, // Already in this feed
    });
    vi.mocked(rssMutations.markFeedFetched).mockResolvedValue();

    const result = await processFeedStep(mockFeed);

    expect(result).toStrictEqual({
      feedId: mockFeed.id,
      feedName: mockFeed.name,
      newArticles: 0,
      reusedArticles: 0,
      skippedArticles: 1,
      success: true,
    });
  });

  it("throws RetryableError on network timeout", async () => {
    const timeoutError = new Error("timeout");
    vi.mocked(rssActions.fetchRssFeedXml).mockRejectedValue(timeoutError);

    await expect(processFeedStep(mockFeed)).rejects.toThrow(RetryableError);
  });

  it("throws RetryableError on ECONNRESET", async () => {
    const connError = new Error("ECONNRESET");
    vi.mocked(rssActions.fetchRssFeedXml).mockRejectedValue(connError);

    await expect(processFeedStep(mockFeed)).rejects.toThrow(RetryableError);
  });

  it("throws RetryableError on ETIMEDOUT", async () => {
    const timeoutError = new Error("ETIMEDOUT");
    vi.mocked(rssActions.fetchRssFeedXml).mockRejectedValue(timeoutError);

    await expect(processFeedStep(mockFeed)).rejects.toThrow(RetryableError);
  });

  it("returns failed stat on non-network fetch errors", async () => {
    const fetchError = new Error("Invalid feed URL");
    vi.mocked(rssActions.fetchRssFeedXml).mockRejectedValue(fetchError);

    const result = await processFeedStep(mockFeed);

    expect(result).toMatchObject({
      error: "Invalid feed URL",
      feedId: mockFeed.id,
      feedName: mockFeed.name,
      newArticles: 0,
      reusedArticles: 0,
      skippedArticles: 0,
      success: false,
    });
  });

  it("returns failed stat on XML parse failure", async () => {
    vi.mocked(rssActions.fetchRssFeedXml).mockResolvedValue("invalid xml");
    vi.mocked(rssActions.parseRssXml).mockReturnValue(null);

    const result = await processFeedStep(mockFeed);

    expect(result).toMatchObject({
      error: "Failed to parse RSS XML",
      feedId: mockFeed.id,
      feedName: mockFeed.name,
      newArticles: 0,
      success: false,
    });
  });

  it("skips articles that fail to upsert", async () => {
    const mockRssData = {
      items: [
        {
          guid: "guid-1",
          link: "https://example.com/good",
          pubDate: "Mon, 21 Apr 2026 10:00:00 GMT",
          title: "Good Article",
        },
        {
          guid: "guid-2",
          link: "https://example.com/bad",
          pubDate: "Mon, 21 Apr 2026 11:00:00 GMT",
          title: "Bad Article",
        },
      ],
      title: "Test Feed",
    };

    vi.mocked(rssActions.fetchRssFeedXml).mockResolvedValue("<rss></rss>");
    vi.mocked(rssActions.parseRssXml).mockReturnValue(mockRssData as never);
    vi.mocked(rssActions.parseDate).mockReturnValue(new Date());
    vi.mocked(rssActions.buildItemMetadata).mockReturnValue(null);

    // First upsert succeeds, second fails
    vi.mocked(rssMutations.upsertRssArticleForFeed)
      .mockResolvedValueOnce({
        alreadyLinked: false,
        inserted: true,
      })
      .mockRejectedValueOnce(new Error("DB error"));

    vi.mocked(rssMutations.markFeedFetched).mockResolvedValue();

    const result = await processFeedStep(mockFeed);

    expect(result).toStrictEqual({
      feedId: mockFeed.id,
      feedName: mockFeed.name,
      newArticles: 1,
      reusedArticles: 0,
      skippedArticles: 1, // Second article failed
      success: true,
    });
  });

  it("counts mixed article results correctly", async () => {
    const mockRssData = {
      items: Array.from({ length: 10 }, (_, i) => ({
        guid: `guid-${i + 1}`,
        link: `https://example.com/article${i + 1}`,
        pubDate: "Mon, 21 Apr 2026 10:00:00 GMT",
        title: `Article ${i + 1}`,
      })),
      title: "Test Feed",
    };

    vi.mocked(rssActions.fetchRssFeedXml).mockResolvedValue("<rss></rss>");
    vi.mocked(rssActions.parseRssXml).mockReturnValue(mockRssData as never);
    vi.mocked(rssActions.parseDate).mockReturnValue(new Date());
    vi.mocked(rssActions.buildItemMetadata).mockReturnValue(null);

    // Simulate various outcomes: 3 new, 4 reused, 3 skipped
    const outcomes = [
      { alreadyLinked: false, inserted: true }, // new
      { alreadyLinked: false, inserted: true }, // new
      { alreadyLinked: false, inserted: true }, // new
      { alreadyLinked: false, inserted: false }, // reused
      { alreadyLinked: false, inserted: false }, // reused
      { alreadyLinked: false, inserted: false }, // reused
      { alreadyLinked: false, inserted: false }, // reused
    ];

    vi.mocked(rssMutations.upsertRssArticleForFeed)
      .mockResolvedValueOnce(outcomes[0] as never)
      .mockResolvedValueOnce(outcomes[1] as never)
      .mockResolvedValueOnce(outcomes[2] as never)
      .mockResolvedValueOnce(outcomes[3] as never)
      .mockResolvedValueOnce(outcomes[4] as never)
      .mockResolvedValueOnce(outcomes[5] as never)
      .mockResolvedValueOnce(outcomes[6] as never)
      .mockRejectedValueOnce(new Error("skip"))
      .mockRejectedValueOnce(new Error("skip"))
      .mockRejectedValueOnce(new Error("skip"));

    vi.mocked(rssMutations.markFeedFetched).mockResolvedValue();

    const result = await processFeedStep(mockFeed);

    expect(result).toMatchObject({
      feedId: mockFeed.id,
      feedName: mockFeed.name,
      newArticles: 3,
      reusedArticles: 4,
      skippedArticles: 3,
      success: true,
    });
  });
});

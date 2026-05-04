import type { RssFeed } from "@cobalt-web/db/schema/news";
import { describe, it, expect, vi, beforeEach } from "vitest";

import * as rssSteps from "./steps.js";
import { rssSyncWorkflow } from "./workflow.js";

vi.mock(import("./steps.js"));
vi.mock(import("../../shared/steps.js"));
vi.mock(import("workflow"), (() => ({
  sleep: vi.fn<() => Promise<void>>().mockResolvedValue(),
})) as never);

const mockFeeds: RssFeed[] = [
  {
    category: "markets",
    company: "CNBC",
    createdAt: new Date(),
    description: "CNBC RSS",
    fetchIntervalMinutes: "5",
    id: "feed-1",
    isActive: true,
    lastFetched: null,
    name: "CNBC",
    updatedAt: new Date(),
    url: "https://cnbc.com/rss",
  },
  {
    category: "markets",
    company: "Bloomberg",
    createdAt: new Date(),
    description: "Bloomberg RSS",
    fetchIntervalMinutes: "5",
    id: "feed-2",
    isActive: true,
    lastFetched: null,
    name: "Bloomberg",
    updatedAt: new Date(),
    url: "https://bloomberg.com/rss",
  },
];
const [firstFeed, secondFeed] = mockFeeds;
if (!(firstFeed && secondFeed)) {
  throw new Error("mockFeeds must have two entries");
}

describe("rssSyncWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns aggregated stats from all feeds", async () => {
    vi.mocked(rssSteps.listActiveFeedsStep).mockResolvedValue(mockFeeds);

    vi.mocked(rssSteps.processFeedStep)
      .mockResolvedValueOnce({
        feedId: "feed-1",
        feedName: "CNBC",
        newArticles: 5,
        reusedArticles: 2,
        skippedArticles: 1,
        success: true,
      })
      .mockResolvedValueOnce({
        feedId: "feed-2",
        feedName: "Bloomberg",
        newArticles: 3,
        reusedArticles: 4,
        skippedArticles: 0,
        success: true,
      });

    const result = await rssSyncWorkflow();

    expect(result).toStrictEqual({
      failedFeeds: 0,
      feedsProcessed: 2,
      newArticles: 8,
      reusedArticles: 6,
    });
  });

  it("handles empty feed list", async () => {
    vi.mocked(rssSteps.listActiveFeedsStep).mockResolvedValue([]);

    const result = await rssSyncWorkflow();

    expect(result).toStrictEqual({
      failedFeeds: 0,
      feedsProcessed: 0,
      newArticles: 0,
      reusedArticles: 0,
    });
  });

  it("counts failed feeds correctly", async () => {
    vi.mocked(rssSteps.listActiveFeedsStep).mockResolvedValue(mockFeeds);

    vi.mocked(rssSteps.processFeedStep)
      .mockResolvedValueOnce({
        feedId: "feed-1",
        feedName: "CNBC",
        newArticles: 5,
        reusedArticles: 2,
        skippedArticles: 1,
        success: true,
      })
      .mockResolvedValueOnce({
        error: "Network timeout",
        feedId: "feed-2",
        feedName: "Bloomberg",
        newArticles: 0,
        reusedArticles: 0,
        skippedArticles: 0,
        success: false,
      });

    const result = await rssSyncWorkflow();

    expect(result).toStrictEqual({
      failedFeeds: 1,
      feedsProcessed: 2,
      newArticles: 5,
      reusedArticles: 2,
    });
  });

  it("handles multiple feed failures", async () => {
    vi.mocked(rssSteps.listActiveFeedsStep).mockResolvedValue(mockFeeds);

    vi.mocked(rssSteps.processFeedStep)
      .mockResolvedValueOnce({
        error: "Parse error",
        feedId: "feed-1",
        feedName: "CNBC",
        newArticles: 0,
        reusedArticles: 0,
        skippedArticles: 0,
        success: false,
      })
      .mockResolvedValueOnce({
        error: "Network timeout",
        feedId: "feed-2",
        feedName: "Bloomberg",
        newArticles: 0,
        reusedArticles: 0,
        skippedArticles: 0,
        success: false,
      });

    const result = await rssSyncWorkflow();

    expect(result).toStrictEqual({
      failedFeeds: 2,
      feedsProcessed: 2,
      newArticles: 0,
      reusedArticles: 0,
    });
  });

  it("calls processFeedStep for each feed", async () => {
    vi.mocked(rssSteps.listActiveFeedsStep).mockResolvedValue(mockFeeds);

    vi.mocked(rssSteps.processFeedStep).mockResolvedValue({
      feedId: "",
      feedName: "",
      newArticles: 0,
      reusedArticles: 0,
      skippedArticles: 0,
      success: true,
    });

    await rssSyncWorkflow();

    expect(vi.mocked(rssSteps.processFeedStep)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(rssSteps.processFeedStep)).toHaveBeenNthCalledWith(1, mockFeeds[0]);
    expect(vi.mocked(rssSteps.processFeedStep)).toHaveBeenNthCalledWith(2, mockFeeds[1]);
  });

  it("throws error when listActiveFeedsStep fails", async () => {
    const listError = new Error("DB connection failed");
    vi.mocked(rssSteps.listActiveFeedsStep).mockRejectedValue(listError);

    await expect(rssSyncWorkflow()).rejects.toThrow("DB connection failed");
  });

  it("throws error when processFeedStep fails", async () => {
    vi.mocked(rssSteps.listActiveFeedsStep).mockResolvedValue([firstFeed]);

    const processError = new Error("Step execution failed");
    vi.mocked(rssSteps.processFeedStep).mockRejectedValue(processError);

    await expect(rssSyncWorkflow()).rejects.toThrow("Step execution failed");
  });

  it("aggregates stats from feeds with all outcomes", async () => {
    const threeFeedsScenario: RssFeed[] = [
      { ...firstFeed, id: "feed-1" },
      { ...secondFeed, id: "feed-2" },
      { ...firstFeed, id: "feed-3" },
    ];

    vi.mocked(rssSteps.listActiveFeedsStep).mockResolvedValue(threeFeedsScenario);

    vi.mocked(rssSteps.processFeedStep)
      .mockResolvedValueOnce({
        feedId: "feed-1",
        feedName: "Feed 1",
        newArticles: 10,
        reusedArticles: 5,
        skippedArticles: 2,
        success: true,
      })
      .mockResolvedValueOnce({
        feedId: "feed-2",
        feedName: "Feed 2",
        newArticles: 3,
        reusedArticles: 7,
        skippedArticles: 1,
        success: true,
      })
      .mockResolvedValueOnce({
        error: "Timeout",
        feedId: "feed-3",
        feedName: "Feed 3",
        newArticles: 0,
        reusedArticles: 0,
        skippedArticles: 0,
        success: false,
      });

    const result = await rssSyncWorkflow();

    expect(result).toStrictEqual({
      failedFeeds: 1,
      feedsProcessed: 3,
      newArticles: 13,
      reusedArticles: 12,
    });
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { Profiler } from "react";
import { describe, expect, it, vi } from "vitest";

import { RecentActivityCard } from "./recent-activity-card";

vi.mock(import("@cobalt-web/ui/cobalt/brokerage/ticker-logo"), () => ({
  TickerLogo: () => <span aria-hidden />,
}));

describe(RecentActivityCard, () => {
  it("never commits an empty out-of-range page when activities shrink, and keeps the corrected page on expansion", () => {
    const activities = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      symbolTicker: `TICKER${i}`,
    }));
    const committedRows: number[] = [];
    const card = (rows: typeof activities) => (
      <Profiler
        id="activity"
        onRender={() => committedRows.push(document.querySelectorAll("li").length)}
      >
        <RecentActivityCard scopedActivities={rows} allActivities={activities} />
      </Profiler>
    );
    const view = render(card(activities));
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(screen.getByText("TICKER14")).toBeTruthy();
    committedRows.length = 0;
    view.rerender(card(activities.slice(0, 8)));
    expect(committedRows.length).toBeGreaterThan(0);
    expect(committedRows.every((count) => count > 0)).toBeTruthy();
    expect(screen.getByText("TICKER7")).toBeTruthy();
    view.rerender(card(activities));
    expect(screen.getByRole("button", { name: "Page 2" }).getAttribute("aria-current")).toBe(
      "page",
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("TICKER14")).toBeTruthy();
  });
});

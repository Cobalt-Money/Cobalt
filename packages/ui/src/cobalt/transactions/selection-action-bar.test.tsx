import { act, render, screen } from "@testing-library/react";
import { startTransition, Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

import { SelectionActionBar } from "./selection-action-bar";

const { promise: pending } = Promise.withResolvers<never>();
const Suspender = ({ suspend }: { suspend: boolean }) => {
  if (suspend) {
    throw pending;
  }
  return null;
};

describe(SelectionActionBar, () => {
  it("retains the committed count on exit even after an abandoned render", () => {
    const bar = (count: number, suspend = false) => (
      <Suspense fallback="Loading">
        <SelectionActionBar count={count} onClear={vi.fn()} onOpenActions={vi.fn()} />
        <Suspender suspend={suspend} />
      </Suspense>
    );
    const view = render(bar(3));
    act(() => startTransition(() => view.rerender(bar(8, true))));
    expect(screen.getByText("3 selected")).toBeTruthy();
    view.rerender(bar(0));
    expect(screen.getByText("3 selected")).toBeTruthy();
  });

  it("cancels an exit when items are reselected and unmounts after the next exit", () => {
    vi.useFakeTimers();
    try {
      const onClear = vi.fn();
      const onOpenActions = vi.fn();
      const bar = (count: number) => (
        <SelectionActionBar count={count} onClear={onClear} onOpenActions={onOpenActions} />
      );
      const view = render(bar(2));
      view.rerender(bar(0));
      act(() => vi.advanceTimersByTime(50));
      expect(screen.getByText("2 selected")).toBeTruthy();
      view.rerender(bar(4));
      act(() => vi.advanceTimersByTime(100));
      expect(screen.getByText("4 selected")).toBeTruthy();
      view.rerender(bar(0));
      act(() => vi.advanceTimersByTime(100));
      expect(screen.queryByText("4 selected")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

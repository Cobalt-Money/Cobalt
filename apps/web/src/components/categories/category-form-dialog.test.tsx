import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CategoryFormDialog } from "./category-form-dialog";

const { createCategory } = vi.hoisted(() => ({ createCategory: vi.fn() }));
vi.mock(import("@/hooks/use-categories"), () => ({ useCreateCategory: () => createCategory }));

describe(CategoryFormDialog, () => {
  it("preserves an edited draft across group updates and equivalent initial values, then resets on reopen", () => {
    const initial = { name: "Coffee", iconKey: "☕", groupId: "food" };
    const groups = [{ id: "food", name: "Food", order: 0, systemKey: null }];
    const onOpenChange = vi.fn();
    const view = render(
      <CategoryFormDialog open onOpenChange={onOpenChange} groups={groups} initial={initial} />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Category name" }), {
      target: { value: "Morning coffee" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Include in insights" }));
    view.rerender(
      <CategoryFormDialog
        open
        onOpenChange={onOpenChange}
        groups={[...groups]}
        initial={{ ...initial }}
      />,
    );
    expect((screen.getByRole("textbox", { name: "Category name" }) as HTMLInputElement).value).toBe(
      "Morning coffee",
    );
    fireEvent.click(screen.getByRole("button", { name: "Create category" }));
    expect(createCategory).toHaveBeenCalledWith({
      name: "Morning coffee",
      iconKey: "☕",
      groupId: "food",
      excludeFromInsights: true,
    });
    view.rerender(
      <CategoryFormDialog
        open={false}
        onOpenChange={onOpenChange}
        groups={groups}
        initial={initial}
      />,
    );
    view.rerender(
      <CategoryFormDialog open onOpenChange={onOpenChange} groups={groups} initial={initial} />,
    );
    expect((screen.getByRole("textbox", { name: "Category name" }) as HTMLInputElement).value).toBe(
      "Coffee",
    );
  });
});

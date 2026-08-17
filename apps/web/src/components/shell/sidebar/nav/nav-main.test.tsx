import { SidebarProvider } from "@cobalt-web/ui/components/sidebar";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";

import { NavMain } from "./nav-main";

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
  })),
});

vi.mock(import("@tanstack/react-router"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRouterState: ((options) =>
      options?.select?.({
        location: { pathname: "/ai-chat" },
      } as never)) as typeof actual.useRouterState,
  };
});

vi.mock(import("@/components/links"), async (importOriginal) => {
  const actual = await importOriginal();
  const MockLink: typeof actual.Link = ({ children, to, ...props }) => (
    <a href={String(to)} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {typeof children === "function"
        ? children({ isActive: false, isTransitioning: false })
        : children}
    </a>
  );
  return { ...actual, Link: MockLink };
});

describe("NavMain", () => {
  it("uses the same full-strength sidebar foreground as chat links", () => {
    render(
      <SidebarProvider>
        <NavMain />
      </SidebarProvider>,
    );

    expect(
      screen.getByRole("link", { name: "Home" }).classList.contains("text-sidebar-foreground"),
    ).toBeTruthy();
  });
});

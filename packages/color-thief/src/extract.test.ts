import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  extractDominantColorFromSource,
  extractPaletteFromSource,
} from "./extract";

const mocks = vi.hoisted(() => ({
  mockGetColor: vi.fn(),
  mockGetPalette: vi.fn(),
  mockGetSwatches: vi.fn(),
}));

vi.mock("colorthief", () => ({
  getColor: (...args: unknown[]) => mocks.mockGetColor(...args),
  getPalette: (...args: unknown[]) => mocks.mockGetPalette(...args),
  getSwatches: (...args: unknown[]) => mocks.mockGetSwatches(...args),
}));

describe("extract wrappers", () => {
  beforeEach(() => {
    mocks.mockGetColor.mockReset();
    mocks.mockGetPalette.mockReset();
    mocks.mockGetSwatches.mockReset();
  });

  it("forwards to colorthief getColor with dynamic import", async () => {
    const fakeColor = { hex: () => "#aabbcc" };
    mocks.mockGetColor.mockResolvedValue(fakeColor);

    const canvas = document.createElement("canvas");
    const out = await extractDominantColorFromSource(canvas, {
      colorSpace: "rgb",
      quality: 1,
    });

    expect(mocks.mockGetColor).toHaveBeenCalledTimes(1);
    expect(mocks.mockGetColor).toHaveBeenCalledWith(canvas, {
      colorSpace: "rgb",
      quality: 1,
    });
    expect(out).toBe(fakeColor);
  });

  it("forwards to colorthief getPalette", async () => {
    const palette = [{ hex: () => "#111111" }];
    mocks.mockGetPalette.mockResolvedValue(palette);

    const canvas = document.createElement("canvas");
    const out = await extractPaletteFromSource(canvas, { colorCount: 3 });

    expect(mocks.mockGetPalette).toHaveBeenCalledWith(canvas, {
      colorCount: 3,
    });
    expect(out).toBe(palette);
  });
});

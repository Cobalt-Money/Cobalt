import { AURORA_FALLBACK_BACKGROUND, deriveAuroraThemeFromHex } from "./derive-aurora-theme";

describe(deriveAuroraThemeFromHex, () => {
  it("returns fallback when hex is null", () => {
    const t = deriveAuroraThemeFromHex(null);
    expect(t.background).toBe(AURORA_FALLBACK_BACKGROUND);
    expect(t.border).toContain("linear-gradient");
  });

  it("derives hsl background from red hex", () => {
    const t = deriveAuroraThemeFromHex("#ff0000");
    expect(t.background).toMatch(/^hsl\(/);
    expect(t.border).toContain("linear-gradient");
  });
});

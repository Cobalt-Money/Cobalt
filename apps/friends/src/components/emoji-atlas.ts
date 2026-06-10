/**
 * Build a single PNG atlas from a list of emoji glyphs so deck.gl's IconLayer
 * can address each by name. Runs once per emoji set; result is a data URL
 * suitable for the `iconAtlas` prop plus an `iconMapping` keyed on the input
 * names. No external dependencies — uses native canvas font rendering.
 */
export interface EmojiAtlasResult {
  url: string;
  mapping: Record<string, { x: number; y: number; width: number; height: number; mask: false }>;
  tile: number;
}

const TILE = 128;
const PADDING = 8;

const EMOJI_FONT = `"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",emoji`;
const FONT_SPEC = `${TILE - PADDING * 2}px ${EMOJI_FONT}`;

export async function buildEmojiAtlas(
  items: { key: string; emoji: string }[],
): Promise<EmojiAtlasResult | null> {
  if (typeof document === "undefined") {
    return null;
  }
  // Color-emoji fonts load lazily. Without this, first paint may rasterize
  // tofu/black-dot fallbacks for glyphs whose font isn't resident yet.
  if (document.fonts?.ready) {
    try {
      await document.fonts.load(FONT_SPEC, items.map((i) => i.emoji).join(""));
      await document.fonts.ready;
    } catch {
      // fall through — best-effort
    }
  }
  const cols = items.length;
  const canvas = document.createElement("canvas");
  canvas.width = TILE * cols;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.font = FONT_SPEC;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const mapping: EmojiAtlasResult["mapping"] = {};
  for (const [i, item] of items.entries()) {
    const cx = i * TILE + TILE / 2;
    const cy = TILE / 2;
    ctx.fillText(item.emoji, cx, cy);
    mapping[item.key] = {
      height: TILE,
      mask: false,
      width: TILE,
      x: i * TILE,
      y: 0,
    };
  }

  return { mapping, tile: TILE, url: canvas.toDataURL("image/png") };
}

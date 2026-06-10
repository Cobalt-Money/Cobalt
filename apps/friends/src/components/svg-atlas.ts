/**
 * Build a single PNG atlas from a list of SVG URLs so deck.gl's IconLayer can
 * address each by name. Loads each SVG via Image(), draws onto a tiled canvas,
 * exports as data URL. Async because Image load is async.
 *
 * Two tile shapes supported:
 *   - "circle"   — 128×128 white disc with svg centered. Center-anchored.
 *   - "teardrop" — 128×160 teardrop (head + tail point). Anchor at tail tip so
 *     the marker's point lands on the geo coord, matching the people-avatar
 *     tile shape so categories + people share visual language.
 */
export interface SvgAtlasMappingEntry {
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX?: number;
  anchorY?: number;
  mask: false;
}

export interface SvgAtlasResult {
  url: string;
  mapping: Record<string, SvgAtlasMappingEntry>;
  tile: number;
}

const CIRCLE_W = 128;
const CIRCLE_H = 128;
const TEARDROP_W = 128;
const TEARDROP_H = 160;
const PADDING = 12;
const HEAD_R = 56; // teardrop head radius
const RING = 6;
const HEAD_CY = HEAD_R + RING;

function loadImage(src: string): Promise<HTMLImageElement> {
  // eslint-disable-next-line promise/avoid-new -- wrapping Image's event-based API requires explicit Promise
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.addEventListener("load", () => resolve(img), { once: true });
    img.addEventListener("error", (e) => reject(e as unknown as Error), { once: true });
    img.src = src;
  });
}

function teardropPath(ctx: CanvasRenderingContext2D, originX: number, tailY: number) {
  const cx = originX + TEARDROP_W / 2;
  const tailDy = tailY - HEAD_CY;
  const phi = Math.acos(HEAD_R / tailDy);
  const start = Math.PI / 2 + phi;
  const end = Math.PI / 2 - phi + Math.PI * 2;
  ctx.beginPath();
  ctx.arc(cx, HEAD_CY, HEAD_R, start, end, false);
  ctx.lineTo(cx, tailY);
  ctx.closePath();
}

export async function buildSvgAtlas(
  items: { key: string; src: string }[],
  shape: "circle" | "teardrop" = "circle",
): Promise<SvgAtlasResult | null> {
  if (typeof document === "undefined") {
    return null;
  }
  const tileW = shape === "teardrop" ? TEARDROP_W : CIRCLE_W;
  const tileH = shape === "teardrop" ? TEARDROP_H : CIRCLE_H;
  const cols = items.length;
  const canvas = document.createElement("canvas");
  canvas.width = tileW * cols;
  canvas.height = tileH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const mapping: SvgAtlasResult["mapping"] = {};
  // Preload all images before drawing. Concurrent async-then-draw on the same
  // canvas context interleaves save/restore/clip calls between iterations and
  // destroys clip state for whichever items hit `await` mid-draw. Loading
  // first, then drawing synchronously, keeps each tile's canvas state isolated.
  const loaded = await Promise.all(
    items.map(async (item) => {
      try {
        return await loadImage(item.src);
      } catch {
        return null;
      }
    }),
  );
  for (const [i, item] of items.entries()) {
    const img = loaded[i] ?? null;
    const originX = i * tileW;
    if (shape === "teardrop") {
      const tailY = tileH - RING / 2;
      ctx.save();
      teardropPath(ctx, originX, tailY);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(originX + tileW / 2, HEAD_CY, HEAD_R - RING, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (img) {
        const iconSize = (HEAD_R - RING) * 1.6;
        ctx.drawImage(
          img,
          originX + tileW / 2 - iconSize / 2,
          HEAD_CY - iconSize / 2,
          iconSize,
          iconSize,
        );
      }
      ctx.restore();
      mapping[item.key] = {
        anchorX: tileW / 2,
        anchorY: tileH,
        height: tileH,
        mask: false,
        width: tileW,
        x: originX,
        y: 0,
      };
    } else {
      const radius = tileW / 2 - 2;
      const cx = originX + tileW / 2;
      const cy = tileH / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      const inner = tileW - PADDING * 2;
      if (img) {
        ctx.drawImage(img, originX + PADDING, PADDING, inner, inner);
      }
      mapping[item.key] = {
        height: tileH,
        mask: false,
        width: tileW,
        x: originX,
        y: 0,
      };
    }
  }

  try {
    return { mapping, tile: tileW, url: canvas.toDataURL("image/png") };
  } catch {
    return null;
  }
}

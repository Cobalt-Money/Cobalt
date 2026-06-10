/**
 * Pre-render a profile picture into a circular tile with a colored ring border,
 * suitable for deck.gl IconLayer. Result is cached by `${url}|${ring}` so the
 * same avatar isn't redrawn per pin. Returns null until the source image
 * resolves; caller should re-render on the `onReady` callback to surface
 * tiles as they finish loading.
 */
// Teardrop dims: square head + pointy tail. Anchor sits at the tail tip so
// the visual "point" lands on the geographic coord.
const TILE_W = 128;
const TILE_H = 160;
const HEAD_R = 56; // disc radius
const RING = 6;
const HEAD_CY = HEAD_R + RING; // disc center Y, with a hair of breathing room

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function rgbCss(color: [number, number, number, number]): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${(color[3] ?? 255) / 255})`;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  // HTMLImageElement.decode() resolves once the image is fully decoded — same
  // result as `load` + canvas-draw, without hand-rolling a Promise wrapper.
  img.src = url;
  await img.decode();
  return img;
}

/**
 * Path of the teardrop outline: head circle on top, tangent lines down to a
 * single tail point. Tangent angle puts the tail apex exactly at the bottom
 * of the canvas. Caller chooses fill/stroke after `clip()` or `stroke()`.
 */
function teardropPath(ctx: CanvasRenderingContext2D, tailY: number) {
  const tailDy = tailY - HEAD_CY;
  // angle from disc center to tail point
  const phi = Math.acos(HEAD_R / tailDy);
  const start = Math.PI / 2 + phi; // left tangent on disc
  const end = Math.PI / 2 - phi + Math.PI * 2; // right tangent, wrapping the top
  ctx.beginPath();
  ctx.arc(TILE_W / 2, HEAD_CY, HEAD_R, start, end, false);
  ctx.lineTo(TILE_W / 2, tailY);
  ctx.closePath();
}

function paintRing(ctx: CanvasRenderingContext2D, tailY: number) {
  teardropPath(ctx, tailY);
  ctx.lineWidth = RING;
  ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function paintAccentDot(ctx: CanvasRenderingContext2D, accent: [number, number, number, number]) {
  // Tiny identity-colored dot at the tail apex — keeps user-color signal
  // even though the ring is white per spec.
  ctx.beginPath();
  ctx.arc(TILE_W / 2, TILE_H - RING * 1.5, RING, 0, Math.PI * 2);
  ctx.fillStyle = rgbCss(accent);
  ctx.fill();
}

function drawCircular(
  img: HTMLImageElement,
  ring: [number, number, number, number],
): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_W;
  canvas.height = TILE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  const tailY = TILE_H - RING / 2;
  // Fill teardrop with white, clip avatar to head circle.
  ctx.save();
  teardropPath(ctx, tailY);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(TILE_W / 2, HEAD_CY, HEAD_R - RING / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const scale = Math.max((HEAD_R * 2) / img.width, (HEAD_R * 2) / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, TILE_W / 2 - w / 2, HEAD_CY - h / 2, w, h);
  ctx.restore();
  paintRing(ctx, tailY);
  paintAccentDot(ctx, ring);
  return canvas.toDataURL("image/png");
}

function drawFallback(initial: string, ring: [number, number, number, number]): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_W;
  canvas.height = TILE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  const tailY = TILE_H - RING / 2;
  ctx.save();
  teardropPath(ctx, tailY);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(30, 30, 36, 0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${HEAD_R}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
  ctx.fillText(initial.toUpperCase().slice(0, 1), TILE_W / 2, HEAD_CY + 4);
  paintRing(ctx, tailY);
  paintAccentDot(ctx, ring);
  return canvas.toDataURL("image/png");
}

export interface AvatarRequest {
  key: string;
  url: string | null;
  fallbackInitial: string;
  ring: [number, number, number, number];
  shape?: "teardrop" | "circle";
}

// Tile matches teardrop height so deck.gl's height-based sizing renders
// circles at the same world size as teardrop heads.
const CIRCLE_TILE = 160;
const CIRCLE_RING = 8;
// Disc fills tile so icon dims match deck.gl sizing 1:1.
const CIRCLE_CENTER = CIRCLE_TILE / 2;
const CIRCLE_R = CIRCLE_CENTER;

function drawCircleAvatar(
  img: HTMLImageElement,
  ring: [number, number, number, number],
): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = CIRCLE_TILE;
  canvas.height = CIRCLE_TILE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(CIRCLE_CENTER, CIRCLE_CENTER, CIRCLE_R - CIRCLE_RING / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const inner = (CIRCLE_R - CIRCLE_RING) * 2;
  const scale = Math.max(inner / img.width, inner / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, CIRCLE_CENTER - w / 2, CIRCLE_CENTER - h / 2, w, h);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(CIRCLE_CENTER, CIRCLE_CENTER, CIRCLE_R - CIRCLE_RING / 2, 0, Math.PI * 2);
  ctx.lineWidth = CIRCLE_RING;
  ctx.strokeStyle = rgbCss(ring);
  ctx.stroke();
  return canvas.toDataURL("image/png");
}

function drawCircleFallback(
  initial: string,
  ring: [number, number, number, number],
): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = CIRCLE_TILE;
  canvas.height = CIRCLE_TILE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.beginPath();
  ctx.arc(CIRCLE_CENTER, CIRCLE_CENTER, CIRCLE_R - CIRCLE_RING / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = "rgba(30, 30, 36, 0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${CIRCLE_R}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
  ctx.fillText(initial.toUpperCase().slice(0, 1), CIRCLE_CENTER, CIRCLE_CENTER + 2);
  ctx.beginPath();
  ctx.arc(CIRCLE_CENTER, CIRCLE_CENTER, CIRCLE_R - CIRCLE_RING / 2, 0, Math.PI * 2);
  ctx.lineWidth = CIRCLE_RING;
  ctx.strokeStyle = rgbCss(ring);
  ctx.stroke();
  return canvas.toDataURL("image/png");
}

/**
 * Resolve an avatar icon synchronously when cached, else trigger async load
 * and call `onReady` when done. Always returns a sensible immediate value:
 * cached URL when available, lettermark fallback otherwise.
 */
export function getAvatarIcon(req: AvatarRequest, onReady: () => void): string {
  const shape = req.shape ?? "teardrop";
  const cacheKey = `${shape}|${req.key}|${req.url ?? "_fb"}|${req.ring.join(",")}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const fallbackDraw =
    shape === "circle"
      ? drawCircleFallback(req.fallbackInitial, req.ring)
      : drawFallback(req.fallbackInitial, req.ring);
  const fallback = fallbackDraw ?? "";
  cache.set(cacheKey, fallback);
  if (!req.url) {
    return fallback;
  }
  if (!inflight.has(cacheKey)) {
    const { url } = req;
    const load = async (): Promise<string | null> => {
      try {
        const img = await loadImage(url);
        const dataUrl =
          shape === "circle" ? drawCircleAvatar(img, req.ring) : drawCircular(img, req.ring);
        if (dataUrl) {
          cache.set(cacheKey, dataUrl);
          onReady();
        }
        return dataUrl;
      } catch {
        return null;
      } finally {
        inflight.delete(cacheKey);
      }
    };
    inflight.set(cacheKey, load());
  }
  return fallback;
}

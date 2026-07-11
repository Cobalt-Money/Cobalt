import {
  brandfetchIcon404FallbackUrl,
  brandfetchIconLettermarkFallbackUrl,
  brandfetchLogo404FallbackUrl,
} from "@cobalt-web/clients/brandfetch";
import { env } from "@cobalt-web/env/web";

// Circle tile (dots style)
const CIRCLE_TILE = 160;
const CIRCLE_RING = 6;
const CIRCLE_CENTER = CIRCLE_TILE / 2;
const CIRCLE_R = CIRCLE_CENTER;

// Teardrop tile (landmark style) — mirrors avatar-icon dims
const TD_W = 128;
const TD_H = 160;
const TD_HEAD_R = 56;
const TD_RING = 6;
const TD_HEAD_CY = TD_HEAD_R + TD_RING;

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function hostFromWebsite(url: string | null | undefined): string | null {
  if (!url?.trim()) {
    return null;
  }
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

function buildCandidates(website: string | null, logoUrl: string | null): string[] {
  const out: string[] = [];
  const clientId = env.VITE_BRANDFETCH_CLIENT_ID;
  const host = hostFromWebsite(website);
  if (clientId && host) {
    out.push(
      brandfetchIcon404FallbackUrl(host, clientId, { h: 128, w: 128 }),
      brandfetchLogo404FallbackUrl(host, clientId, { h: 128, w: 128 }),
    );
    out.push(brandfetchIconLettermarkFallbackUrl(host, clientId, { h: 128, w: 128 }));
  }
  if (logoUrl?.startsWith("http")) {
    out.push(logoUrl);
  }
  return out;
}

async function tryLoad(url: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

function teardropPath(ctx: CanvasRenderingContext2D, tailY: number) {
  const tailDy = tailY - TD_HEAD_CY;
  const phi = Math.acos(TD_HEAD_R / tailDy);
  const start = Math.PI / 2 + phi;
  const end = Math.PI / 2 - phi + Math.PI * 2;
  ctx.beginPath();
  ctx.arc(TD_W / 2, TD_HEAD_CY, TD_HEAD_R, start, end, false);
  ctx.lineTo(TD_W / 2, tailY);
  ctx.closePath();
}

function drawCircleLogo(img: HTMLImageElement): string | null {
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
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.clip();
  const inner = (CIRCLE_R - CIRCLE_RING) * 2;
  const scale = Math.min(inner / img.width, inner / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, CIRCLE_CENTER - w / 2, CIRCLE_CENTER - h / 2, w, h);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(CIRCLE_CENTER, CIRCLE_CENTER, CIRCLE_R - CIRCLE_RING / 2, 0, Math.PI * 2);
  ctx.lineWidth = CIRCLE_RING;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  return canvas.toDataURL("image/png");
}

function drawCircleFallback(initial: string): string | null {
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
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  return canvas.toDataURL("image/png");
}

function drawTeardropLogo(img: HTMLImageElement): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = TD_W;
  canvas.height = TD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  const tailY = TD_H - TD_RING / 2;
  ctx.save();
  teardropPath(ctx, tailY);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(TD_W / 2, TD_HEAD_CY, TD_HEAD_R - TD_RING / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const inner = (TD_HEAD_R - TD_RING) * 2;
  const scale = Math.min(inner / img.width, inner / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, TD_W / 2 - w / 2, TD_HEAD_CY - h / 2, w, h);
  ctx.restore();
  teardropPath(ctx, tailY);
  ctx.lineWidth = TD_RING;
  ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round";
  ctx.stroke();
  return canvas.toDataURL("image/png");
}

function drawTeardropFallback(initial: string): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = TD_W;
  canvas.height = TD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  const tailY = TD_H - TD_RING / 2;
  ctx.save();
  teardropPath(ctx, tailY);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(30, 30, 36, 0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${TD_HEAD_R}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
  ctx.fillText(initial.toUpperCase().slice(0, 1), TD_W / 2, TD_HEAD_CY + 4);
  teardropPath(ctx, tailY);
  ctx.lineWidth = TD_RING;
  ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round";
  ctx.stroke();
  return canvas.toDataURL("image/png");
}

export type MerchantIconShape = "circle" | "teardrop";

export interface MerchantIconRequest {
  key: string;
  merchant: string;
  website: string | null;
  logoUrl: string | null;
  shape?: MerchantIconShape;
}

export function getMerchantIcon(req: MerchantIconRequest, onReady: () => void): string {
  const shape: MerchantIconShape = req.shape ?? "teardrop";
  const cacheKey = `${shape}|${req.key}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const initial = req.merchant.trim().charAt(0) || "?";
  const fb =
    (shape === "circle" ? drawCircleFallback(initial) : drawTeardropFallback(initial)) ?? "";
  cache.set(cacheKey, fb);
  const candidates = buildCandidates(req.website, req.logoUrl);
  if (candidates.length === 0) {
    return fb;
  }
  if (!inflight.has(cacheKey)) {
    const load = async (): Promise<string | null> => {
      try {
        for (const url of candidates) {
          const img = await tryLoad(url);
          if (!img) {
            continue;
          }
          const data = shape === "circle" ? drawCircleLogo(img) : drawTeardropLogo(img);
          if (data) {
            cache.set(cacheKey, data);
            onReady();
            return data;
          }
        }
        return null;
      } finally {
        inflight.delete(cacheKey);
      }
    };
    inflight.set(cacheKey, load());
  }
  return fb;
}

import type { ReactNode } from "react";

import { brandfetchDefaultLogoUrl } from "@cobalt-web/clients/brandfetch";

const CursorIcon = (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23"
      fill="currentColor"
    />
  </svg>
);

function brandfetchSymbolUrl(
  domain: string,
  clientId: string,
  opts: { theme?: "light" | "dark"; size?: number },
): string {
  const host = domain.replace(/^www\./, "").toLowerCase();
  const size = opts.size ?? 256;
  const themePart = opts.theme ? `theme/${opts.theme}/` : "";
  const path = `https://cdn.brandfetch.io/domain/${host}/w/${size}/h/${size}/${themePart}fallback/404/symbol`;
  const url = new URL(path);
  url.searchParams.set("c", clientId);
  return url.toString();
}

interface FloatIcon {
  id: string;
  domain: string;
  top: string;
  left?: string;
  right?: string;
  rotate: number;
  size: number;
  override?: ReactNode;
}

const ICONS: FloatIcon[] = [
  { domain: "claude.com", id: "claude", left: "8%", rotate: -14, size: 84, top: "8%" },
  { domain: "openai.com", id: "chatgpt", right: "9%", rotate: 12, size: 88, top: "6%" },
  {
    domain: "cursor.com",
    id: "cursor",
    left: "12%",
    override: CursorIcon,
    rotate: 8,
    size: 72,
    top: "28%",
  },
  { domain: "n8n.io", id: "n8n", right: "13%", rotate: -10, size: 76, top: "30%" },
  { domain: "raycast.com", id: "raycast", left: "10%", rotate: 16, size: 80, top: "62%" },
  { domain: "notion.so", id: "notion", right: "10%", rotate: -8, size: 72, top: "70%" },
  { domain: "slack.com", id: "slack", left: "16%", rotate: -18, size: 68, top: "88%" },
  { domain: "google.com", id: "sheets", right: "18%", rotate: 14, size: 68, top: "85%" },
  { domain: "lovable.dev", id: "lovable", right: "10%", rotate: 10, size: 70, top: "50%" },
  { domain: "replit.com", id: "replit", left: "4%", rotate: -10, size: 70, top: "45%" },
];

function IconTile({ icon, clientId, size }: { icon: FloatIcon; clientId: string; size: number }) {
  const lightSrc = brandfetchSymbolUrl(icon.domain, clientId, { theme: "light" });
  const darkSrc = brandfetchSymbolUrl(icon.domain, clientId, { theme: "dark" });
  const fallbackSrc = brandfetchDefaultLogoUrl(icon.domain, clientId, {
    h: 256,
    svg: false,
    w: 256,
  });
  const imgStyle = { height: size * 0.6, width: size * 0.6 };
  const onError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (e.currentTarget.src !== fallbackSrc) {
      e.currentTarget.src = fallbackSrc;
    }
  };
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-2xl bg-neutral-200/70 shadow-lg dark:bg-neutral-800/60 dark:shadow-2xl"
      style={{ height: size, width: size }}
    >
      {icon.override ? (
        <div className="text-neutral-700 [&_svg]:size-full dark:text-neutral-200" style={imgStyle}>
          {icon.override}
        </div>
      ) : (
        <>
          <img
            alt=""
            className="object-contain dark:hidden"
            onError={onError}
            src={darkSrc}
            style={imgStyle}
          />
          <img
            alt=""
            className="hidden object-contain dark:block"
            onError={onError}
            src={lightSrc}
            style={imgStyle}
          />
        </>
      )}
    </div>
  );
}

export function MobileIntegrationsRow({ position }: { position: "top" | "bottom" }) {
  const clientId = (import.meta.env.VITE_BRANDFETCH_CLIENT_ID as string | undefined)?.trim() ?? "";
  if (!clientId) {
    return null;
  }
  const half = Math.ceil(ICONS.length / 2);
  const items = position === "top" ? ICONS.slice(0, half) : ICONS.slice(half);
  return (
    <div aria-hidden="true" className="flex flex-wrap justify-center gap-3 px-4 lg:hidden">
      {items.map((i) => (
        <IconTile clientId={clientId} icon={i} key={i.id} size={48} />
      ))}
    </div>
  );
}

export function FloatingIntegrations() {
  const clientId = (import.meta.env.VITE_BRANDFETCH_CLIENT_ID as string | undefined)?.trim() ?? "";
  if (!clientId) {
    return null;
  }
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
    >
      {ICONS.map((i) => {
        const lightSrc = brandfetchSymbolUrl(i.domain, clientId, { theme: "light" });
        const darkSrc = brandfetchSymbolUrl(i.domain, clientId, { theme: "dark" });
        const fallbackSrc = brandfetchDefaultLogoUrl(i.domain, clientId, {
          h: 256,
          svg: false,
          w: 256,
        });
        const imgStyle = { height: i.size * 0.6, width: i.size * 0.6 };
        const onError = (e: React.SyntheticEvent<HTMLImageElement>) => {
          if (e.currentTarget.src !== fallbackSrc) {
            e.currentTarget.src = fallbackSrc;
          }
        };
        return (
          <div
            className="absolute flex items-center justify-center rounded-2xl bg-neutral-200/70 shadow-lg dark:bg-neutral-800/60 dark:shadow-2xl"
            key={i.id}
            style={{
              height: i.size,
              left: i.left,
              right: i.right,
              top: i.top,
              transform: `rotate(${i.rotate}deg)`,
              width: i.size,
            }}
          >
            {i.override ? (
              <div
                className="text-neutral-700 [&_svg]:size-full dark:text-neutral-200"
                style={imgStyle}
              >
                {i.override}
              </div>
            ) : (
              <>
                <img
                  alt=""
                  className="object-contain dark:hidden"
                  onError={onError}
                  src={darkSrc}
                  style={imgStyle}
                />
                <img
                  alt=""
                  className="hidden object-contain dark:block"
                  onError={onError}
                  src={lightSrc}
                  style={imgStyle}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

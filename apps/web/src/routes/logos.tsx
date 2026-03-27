import {
  brandfetchDefaultLogoUrl,
  brandfetchDimensionsOnlyUrl,
  brandfetchLogoAssetUrl,
} from "@cobalt-web/clients/brandfetch";
import {
  logoDevUrlByBrandName,
  logoDevUrlByDomain,
} from "@cobalt-web/clients/logo-dev";
import { env } from "@cobalt-web/env/web";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cobalt-web/ui/components/card";
import { Input } from "@cobalt-web/ui/components/input";
import { Label } from "@cobalt-web/ui/components/label";
import { Separator } from "@cobalt-web/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cobalt-web/ui/components/tooltip";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";

/** Same path dimensions for every preview URL + Logo.dev `size`. */
const PREVIEW_PX = 128;

/** Large preview panel (bigger than `LogoThumb` size-20). */
const CUSTOM_PREVIEW_PX = 288;

function parseHttpUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  try {
    const u = new URL(t);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return u.href;
    }
    return null;
  } catch {
    return null;
  }
}

async function copyUrlToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("URL copied");
  } catch {
    toast.error("Couldn't copy URL");
  }
}

export const Route = createFileRoute("/logos")({
  component: LogosPlaygroundPage,
  staticData: { title: "Logos (dev)" },
});

function LogosPlaygroundPage() {
  const [bfDomain, setBfDomain] = useState("spotify.com");
  const [bfClientId, setBfClientId] = useState(
    () => env.VITE_BRANDFETCH_CLIENT_ID ?? ""
  );

  const [ldDomain, setLdDomain] = useState("amazon.com");
  const [ldBrandName, setLdBrandName] = useState("Starbucks");
  const [ldToken, setLdToken] = useState(
    () => env.VITE_LOGO_DEV_PUBLISHABLE_KEY ?? ""
  );

  const [customUrlInput, setCustomUrlInput] = useState("");
  const customUrl = useMemo(
    () => parseHttpUrl(customUrlInput),
    [customUrlInput]
  );

  const brandfetchSymbolSvgUrl = useMemo(() => {
    const id = bfClientId.trim();
    const d = bfDomain.trim();
    if (!(id && d)) {
      return null;
    }
    try {
      return brandfetchLogoAssetUrl(d, id, {
        asset: "symbol",
        h: PREVIEW_PX,
        svg: true,
        w: PREVIEW_PX,
      });
    } catch {
      return null;
    }
  }, [bfClientId, bfDomain]);

  const brandfetchSymbolPlainUrl = useMemo(() => {
    const id = bfClientId.trim();
    const d = bfDomain.trim();
    if (!(id && d)) {
      return null;
    }
    try {
      return brandfetchLogoAssetUrl(d, id, {
        asset: "symbol",
        h: PREVIEW_PX,
        svg: false,
        w: PREVIEW_PX,
      });
    } catch {
      return null;
    }
  }, [bfClientId, bfDomain]);

  const brandfetchLogoSvgUrl = useMemo(() => {
    const id = bfClientId.trim();
    const d = bfDomain.trim();
    if (!(id && d)) {
      return null;
    }
    try {
      return brandfetchLogoAssetUrl(d, id, {
        asset: "logo",
        h: PREVIEW_PX,
        svg: true,
        w: PREVIEW_PX,
      });
    } catch {
      return null;
    }
  }, [bfClientId, bfDomain]);

  const brandfetchDefaultUrl = useMemo(() => {
    const id = bfClientId.trim();
    const d = bfDomain.trim();
    if (!(id && d)) {
      return null;
    }
    try {
      return brandfetchDefaultLogoUrl(d, id, {
        h: PREVIEW_PX,
        w: PREVIEW_PX,
      });
    } catch {
      return null;
    }
  }, [bfClientId, bfDomain]);

  const brandfetchDimensionsOnlyPreviewUrl = useMemo(() => {
    const id = bfClientId.trim();
    const d = bfDomain.trim();
    if (!(id && d)) {
      return null;
    }
    try {
      return brandfetchDimensionsOnlyUrl(d, id, {
        h: PREVIEW_PX,
        w: PREVIEW_PX,
      });
    } catch {
      return null;
    }
  }, [bfClientId, bfDomain]);

  const brandfetchThemeLightUrl = useMemo(() => {
    const id = bfClientId.trim();
    const d = bfDomain.trim();
    if (!(id && d)) {
      return null;
    }
    try {
      return brandfetchLogoAssetUrl(d, id, {
        asset: "symbol",
        h: PREVIEW_PX,
        svg: false,
        theme: "light",
        w: PREVIEW_PX,
      });
    } catch {
      return null;
    }
  }, [bfClientId, bfDomain]);

  const brandfetchThemeDarkUrl = useMemo(() => {
    const id = bfClientId.trim();
    const d = bfDomain.trim();
    if (!(id && d)) {
      return null;
    }
    try {
      return brandfetchLogoAssetUrl(d, id, {
        asset: "symbol",
        h: PREVIEW_PX,
        svg: false,
        theme: "dark",
        w: PREVIEW_PX,
      });
    } catch {
      return null;
    }
  }, [bfClientId, bfDomain]);

  const brandfetchLogoThemeLightUrl = useMemo(() => {
    const id = bfClientId.trim();
    const d = bfDomain.trim();
    if (!(id && d)) {
      return null;
    }
    try {
      return brandfetchLogoAssetUrl(d, id, {
        asset: "logo",
        h: PREVIEW_PX,
        svg: false,
        theme: "light",
        w: PREVIEW_PX,
      });
    } catch {
      return null;
    }
  }, [bfClientId, bfDomain]);

  const brandfetchLogoThemeDarkUrl = useMemo(() => {
    const id = bfClientId.trim();
    const d = bfDomain.trim();
    if (!(id && d)) {
      return null;
    }
    try {
      return brandfetchLogoAssetUrl(d, id, {
        asset: "logo",
        h: PREVIEW_PX,
        svg: false,
        theme: "dark",
        w: PREVIEW_PX,
      });
    } catch {
      return null;
    }
  }, [bfClientId, bfDomain]);

  const logoDevDomainUrl = useMemo(() => {
    const t = ldToken.trim();
    const d = ldDomain.trim();
    if (!(t && d)) {
      return null;
    }
    try {
      return logoDevUrlByDomain(d, { size: PREVIEW_PX, token: t });
    } catch {
      return null;
    }
  }, [ldDomain, ldToken]);

  const logoDevNameUrl = useMemo(() => {
    const t = ldToken.trim();
    const n = ldBrandName.trim();
    if (!(t && n)) {
      return null;
    }
    try {
      return logoDevUrlByBrandName(n, { size: PREVIEW_PX, token: t });
    } catch {
      return null;
    }
  }, [ldBrandName, ldToken]);

  return (
    <SidebarShellLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div>
            <h1 className="font-semibold text-2xl tracking-tight">
              Logo API playground
            </h1>
            <p className="text-muted-foreground text-sm">
              Temporary route — Brandfetch CDN + Logo.dev URLs. Hover a
              thumbnail for details; click a thumbnail to update the custom URL
              on the right, copy it, and preview it large.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Brandfetch (CDN)</CardTitle>
              <CardDescription>
                Client id is <code className="text-xs">?c=</code>. Optional{" "}
                <code className="text-xs">theme/light</code> /{" "}
                <code className="text-xs">theme/dark</code>.{" "}
                <code className="text-xs">.svg</code> suffix unless{" "}
                <code className="text-xs">svg: false</code>. One variant stops
                after <code className="text-xs">…/w/h/</code> with no asset
                segment.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="bf-domain">Domain</Label>
                  <Input
                    id="bf-domain"
                    onChange={(e) => {
                      setBfDomain(e.target.value);
                    }}
                    placeholder="spotify.com"
                    value={bfDomain}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bf-client">Client id</Label>
                  <Input
                    id="bf-client"
                    onChange={(e) => {
                      setBfClientId(e.target.value);
                    }}
                    placeholder="VITE_BRANDFETCH_CLIENT_ID"
                    value={bfClientId}
                  />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide">
                  Path variants ({PREVIEW_PX}×{PREVIEW_PX} in URL)
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <LogoThumb
                    label="…/w/128/h/128/symbol.svg"
                    onSelectUrl={setCustomUrlInput}
                    url={brandfetchSymbolSvgUrl}
                  />
                  <LogoThumb
                    label="…/w/128/h/128/symbol (no .svg)"
                    onSelectUrl={setCustomUrlInput}
                    url={brandfetchSymbolPlainUrl}
                  />
                  <LogoThumb
                    label="…/w/128/h/128/logo.svg"
                    onSelectUrl={setCustomUrlInput}
                    url={brandfetchLogoSvgUrl}
                  />
                  <LogoThumb
                    label="brandfetchDefaultLogoUrl → …/symbol.svg"
                    onSelectUrl={setCustomUrlInput}
                    url={brandfetchDefaultUrl}
                  />
                  <LogoThumb
                    label="…/w/128/h/128/?c=… (no logo/symbol segment)"
                    onSelectUrl={setCustomUrlInput}
                    url={brandfetchDimensionsOnlyPreviewUrl}
                  />
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide">
                  Themed ({PREVIEW_PX}×{PREVIEW_PX} in URL)
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <LogoThumb
                    label="…/theme/light/symbol"
                    onSelectUrl={setCustomUrlInput}
                    url={brandfetchThemeLightUrl}
                  />
                  <LogoThumb
                    label="…/theme/dark/symbol"
                    onSelectUrl={setCustomUrlInput}
                    url={brandfetchThemeDarkUrl}
                  />
                  <LogoThumb
                    label="…/theme/light/logo"
                    onSelectUrl={setCustomUrlInput}
                    url={brandfetchLogoThemeLightUrl}
                  />
                  <LogoThumb
                    label="…/theme/dark/logo"
                    onSelectUrl={setCustomUrlInput}
                    url={brandfetchLogoThemeDarkUrl}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo.dev</CardTitle>
              <CardDescription>
                Publishable key as <code className="text-xs">token</code> query
                param.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="ld-token">Publishable key</Label>
                  <Input
                    id="ld-token"
                    onChange={(e) => {
                      setLdToken(e.target.value);
                    }}
                    placeholder="VITE_LOGO_DEV_PUBLISHABLE_KEY"
                    type="password"
                    value={ldToken}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ld-domain">Domain</Label>
                  <Input
                    id="ld-domain"
                    onChange={(e) => {
                      setLdDomain(e.target.value);
                    }}
                    placeholder="amazon.com"
                    value={ldDomain}
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:max-w-md">
                <Label htmlFor="ld-name">Brand name</Label>
                <Input
                  id="ld-name"
                  onChange={(e) => {
                    setLdBrandName(e.target.value);
                  }}
                  placeholder="Starbucks"
                  value={ldBrandName}
                />
              </div>
              <Separator />
              <div className="flex flex-wrap items-center gap-3">
                <LogoThumb
                  label="By domain (img.logo.dev/…)"
                  onSelectUrl={setCustomUrlInput}
                  url={logoDevDomainUrl}
                />
                <LogoThumb
                  label="By name (…/name/…)"
                  onSelectUrl={setCustomUrlInput}
                  url={logoDevNameUrl}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="w-full shrink-0 xl:sticky xl:top-4 xl:w-[min(100%,22rem)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom URL</CardTitle>
              <CardDescription>
                Paste or edit any <code className="text-xs">https://</code> logo
                URL. Click a variant thumbnail to load it here and copy it.
                Click the preview to copy again.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid gap-2">
                <Label htmlFor="custom-logo-url">URL</Label>
                <Input
                  className="font-mono text-xs"
                  id="custom-logo-url"
                  onChange={(e) => {
                    setCustomUrlInput(e.target.value);
                  }}
                  placeholder="https://cdn.brandfetch.io/…"
                  spellCheck={false}
                  value={customUrlInput}
                />
              </div>
              <button
                aria-label={
                  customUrl ? "Copy custom logo URL" : "No valid URL to copy"
                }
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-muted/30 p-4 outline-none ring-offset-background transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!customUrl}
                onClick={async () => {
                  if (customUrl) {
                    await copyUrlToClipboard(customUrl);
                  }
                }}
                style={{
                  minHeight: CUSTOM_PREVIEW_PX,
                  minWidth: "100%",
                }}
                type="button"
              >
                {customUrl ? (
                  <img
                    alt=""
                    className="pointer-events-none h-auto max-h-[min(360px,70vh)] w-auto max-w-full object-contain"
                    src={customUrl}
                  />
                ) : (
                  <p className="text-muted-foreground px-2 text-center text-sm">
                    {customUrlInput.trim()
                      ? "Enter a valid http(s) URL to preview."
                      : "Type a URL above to see it here."}
                  </p>
                )}
              </button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </SidebarShellLayout>
  );
}

function LogoThumb({
  label,
  onSelectUrl,
  url,
}: {
  label: string;
  onSelectUrl?: (url: string) => void;
  url: string | null;
}) {
  const emptyHint = "Fill in the fields above to load this URL.";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={
              url
                ? `Load in custom URL field and copy: ${label}`
                : `No URL loaded (${label})`
            }
            className="inline-flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-background p-1.5 outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={async () => {
              if (url) {
                onSelectUrl?.(url);
                await copyUrlToClipboard(url);
              }
            }}
            type="button"
          />
        }
      >
        {url ? (
          <img
            alt=""
            className="h-full w-full min-h-0 min-w-0 object-contain"
            src={url}
          />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TooltipTrigger>
      <TooltipContent
        className="max-w-[min(90vw,24rem)]"
        side="bottom"
        align="start"
      >
        <div className="flex flex-col gap-1.5 text-left">
          <p className="font-medium">{label}</p>
          {url ? (
            <>
              <p className="break-all font-mono text-[11px] leading-snug opacity-90">
                {url}
              </p>
              <p className="text-[11px] opacity-75">
                Click to load in custom URL and copy
              </p>
            </>
          ) : (
            <p className="text-[11px] opacity-90">{emptyHint}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

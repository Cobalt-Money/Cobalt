import { brandfetchDomainFallbackUrls } from "@cobalt-web/clients/brandfetch";
import { LogoImageWithFallback } from "@cobalt-web/ui/cobalt/logos/logo-image-fallback";
import { useMemo } from "react";

const LOGOS: { name: string; domain: string }[] = [
  { domain: "spotify.com", name: "Spotify" },
  { domain: "ramp.com", name: "Ramp" },
  { domain: "vercel.com", name: "Vercel" },
  { domain: "google.com", name: "Google" },
  { domain: "tesla.com", name: "Tesla" },
  { domain: "goldmansachs.com", name: "Goldman Sachs" },
  { domain: "oracle.com", name: "Oracle" },
  { domain: "ally.com", name: "Ally" },
  { domain: "fidelity.com", name: "Fidelity" },
];

const CLIENT_ID = (import.meta.env.VITE_BRANDFETCH_CLIENT_ID as string | undefined)?.trim() ?? "";

function SymbolLogo({ domain, name }: { domain: string; name: string }) {
  const candidates = useMemo(() => brandfetchDomainFallbackUrls(domain, CLIENT_ID), [domain]);
  return (
    <LogoImageWithFallback
      alt={name}
      candidates={candidates}
      className="size-10 shrink-0 !rounded-none !bg-transparent opacity-70 transition-opacity hover:opacity-100 sm:size-12"
      imgClassName="object-contain"
    />
  );
}

export function LogoMarquee() {
  const row = [...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS];
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-6">
        <p className="text-center text-sm text-muted-foreground">
          Used by the busiest professionals at
        </p>
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-[marquee_35s_linear_infinite] items-center gap-16 sm:gap-24">
            {row.map((logo, i) => (
              <SymbolLogo domain={logo.domain} key={`${logo.domain}-${i}`} name={logo.name} />
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

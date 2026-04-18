import { cn } from "@cobalt-web/ui/lib/utils";
import type { ReactNode } from "react";

export interface AuroraCardFrameProps {
  borderGradient: string;
  children?: ReactNode;
  className?: string;
  /** Decorative accent orbs (e.g. brand colors). Hidden when empty. */
  accent?: ReactNode;
}

/**
 * Glassmorphism card with gradient border mask (aurora “glow” frame).
 */
export function AuroraCardFrame({
  accent,
  borderGradient,
  children,
  className,
}: AuroraCardFrameProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl transition-all duration-700",
        className
      )}
      style={{
        backdropFilter: "blur(21px)",
        background:
          "radial-gradient(100% 100% at 100% 0%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)",
      }}
    >
      <div
        className="absolute inset-0 rounded-2xl transition-all duration-700"
        style={{
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          background: borderGradient,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          opacity: 0.8,
          padding: "3px",
        }}
      />
      {accent ? (
        <div className="absolute top-5 right-5 z-10 flex">{accent}</div>
      ) : null}
      <div className="relative z-[1] p-5 pt-6">{children}</div>
    </div>
  );
}

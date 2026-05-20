// import { QRCode } from "react-qr-code";

import { MobilePhoneFrame } from "@/components/landing/mobile-section";

const APP_STORE_URL = "https://apps.apple.com/app/id6757945133";

export function MobileStep() {
  const isDesktop =
    typeof window !== "undefined" && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="font-semibold text-2xl tracking-tight">Install the iOS app</h1>
      <div className="flex items-center gap-4">
        <div className="h-[400px] w-[195px] overflow-visible 2xl:h-[480px] 2xl:w-[234px]">
          <div className="origin-top-left scale-[0.625] 2xl:scale-[0.75]">
            <MobilePhoneFrame />
          </div>
        </div>
        {isDesktop ? null : (
          <a
            className="text-sm underline underline-offset-4"
            href={APP_STORE_URL}
            rel="noreferrer"
            target="_blank"
          >
            Open App Store →
          </a>
        )}
        {/* QR commented out for now
        {isDesktop && (
          <div className="rounded-xl bg-white p-3">
            <QRCode size={140} value={APP_STORE_URL} />
          </div>
        )}
        */}
      </div>
    </div>
  );
}

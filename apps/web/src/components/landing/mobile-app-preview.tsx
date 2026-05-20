/**
 * Mobile-only hero preview. Single screenshot swapped by theme.
 * Files in `apps/web/public/landing/mobile-screenshots/`.
 */

export function MobileAppPreview() {
  return (
    <div className="flex justify-center">
      <img
        alt="Cobalt"
        className="h-auto w-full max-w-sm object-contain dark:hidden"
        decoding="async"
        src="/landing/mobile-screenshots/light-mode.png"
      />
      <img
        alt="Cobalt"
        className="hidden h-auto w-full max-w-sm object-contain dark:block"
        decoding="async"
        src="/landing/mobile-screenshots/dark-mode.png"
      />
    </div>
  );
}

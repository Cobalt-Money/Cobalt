import { useEffect, useRef, useState } from "react";

/** Duration must match `--text-swap-dur` in globals.css `.t-text-swap`. */
const TEXT_SWAP_DURATION_MS = 200;

/**
 * Three-phase text swap driven by the `.t-text-swap` stylesheet in
 * `apps/web/src/globals.css`:
 *   1. `.is-exit` — old text slides up + blurs + fades.
 *   2. After `--text-swap-dur`, swap textContent and apply
 *      `.is-enter-start` (jump below, transitions disabled).
 *   3. Force reflow, drop `.is-enter-start` so the new text animates in.
 *
 * Originally lived in `components/accounts/onboarding-progress.tsx` for the
 * Plaid syncing toast; extracted here so the demo-seed loader can reuse the
 * same visual language.
 */
export function TextSwap({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || displayed === value) {
      return;
    }

    el.classList.add("is-exit");
    const t = setTimeout(() => {
      setDisplayed(value);
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      // Force reflow so the browser registers the "below" position before we
      // drop the class and let the transition animate the entry back to 0.
      void el.getBoundingClientRect().height;
      el.classList.remove("is-enter-start");
    }, TEXT_SWAP_DURATION_MS);

    return () => {
      clearTimeout(t);
      el.classList.remove("is-exit", "is-enter-start");
    };
  }, [value, displayed]);

  return (
    <span className="t-text-swap" ref={ref}>
      {displayed}
    </span>
  );
}

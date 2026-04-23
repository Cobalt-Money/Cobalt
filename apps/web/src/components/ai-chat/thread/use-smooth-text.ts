import { useEffect, useRef, useState } from "react";

interface SmoothTextOptions {
  /**
   * Characters revealed per second when the smoother is at the live edge.
   * Default: 400 cps. Picked per-model in the consumers (Haiku faster, Opus
   * slower) to match generation speed.
   */
  charsPerSec?: number;
  /**
   * Rubber-band: when the buffer (target − visible) exceeds this many chars,
   * the effective reveal rate scales up linearly so the smoother never falls
   * unboundedly behind the model. At `bufferThreshold` chars pending the rate
   * doubles; at `2 × bufferThreshold` it triples; etc.
   *
   * Default: 80 chars.
   */
  bufferThreshold?: number;
}

/**
 * Decouples a growing target string from the displayed string, revealing
 * characters at a fixed cadence via requestAnimationFrame. Adapted from
 * https://upstash.com/blog/smooth-streaming.
 *
 * - When `target` grows, the visible slice catches up at `charsPerSec`,
 *   accelerating per `bufferThreshold` so long bursts don't dump at the end.
 * - When `target` shrinks (regenerate, edit), the visible slice clamps.
 * - When the visible slice has caught up, the RAF loop terminates — no idle
 *   work when the message is settled.
 */
/**
 * Typewriter cadence tuned per model. Faster models (Haiku) need a higher rate
 * so the smoother keeps up with generation; slower ones (Opus) feel more
 * deliberate at a lower rate.
 */
export function charsPerSecForModel(modelId: string): number {
  if (modelId.includes("haiku")) {
    return 600;
  }
  if (modelId.includes("opus")) {
    return 300;
  }
  return 400;
}

export function useSmoothText(
  target: string,
  opts?: SmoothTextOptions
): string {
  const charsPerSec = opts?.charsPerSec ?? 400;
  const bufferThreshold = opts?.bufferThreshold ?? 80;
  const msPerChar = 1000 / charsPerSec;

  const [visible, setVisible] = useState(target);
  // Source of truth for how far we've revealed; lives in a ref so target
  // changes don't reset our position.
  const lengthRef = useRef(target.length);

  useEffect(() => {
    if (lengthRef.current > target.length) {
      lengthRef.current = target.length;
      setVisible(target.slice(0, lengthRef.current));
    }
    if (lengthRef.current >= target.length) {
      return;
    }

    let rafId: number;
    let lastTick = performance.now();

    const tick = (now: number) => {
      const elapsed = now - lastTick;
      const buffer = target.length - lengthRef.current;
      const speedBoost = 1 + buffer / bufferThreshold;
      const effectiveMsPerChar = msPerChar / speedBoost;

      if (elapsed >= effectiveMsPerChar) {
        const advance = Math.max(1, Math.floor(elapsed / effectiveMsPerChar));
        lengthRef.current = Math.min(
          target.length,
          lengthRef.current + advance
        );
        setVisible(target.slice(0, lengthRef.current));
        lastTick = now;
      }
      if (lengthRef.current < target.length) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, msPerChar, bufferThreshold]);

  return visible;
}

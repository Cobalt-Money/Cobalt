import { Github01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";

const GITHUB_URL = "https://github.com/Cobalt-Money/Cobalt";

export function OpenSourceStep({ phase = 0 }: { phase?: number }) {
  return (
    <div className="flex w-full flex-col items-center text-center">
      <h1 className="max-w-md font-semibold text-3xl leading-tight tracking-tight">
        Your finances should not be hidden from you.
      </h1>
      <AnimatePresence>
        {phase >= 1 && (
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 max-w-md font-semibold text-3xl leading-tight tracking-tight"
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            Cobalt is 100% open source.
          </motion.h1>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase >= 1 && (
          <motion.a
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
            exit={{ opacity: 0, y: -8 }}
            href={GITHUB_URL}
            initial={{ opacity: 0, y: 8 }}
            rel="noreferrer"
            target="_blank"
            transition={{ delay: 0.15, duration: 0.35, ease: "easeOut" }}
          >
            <HugeiconsIcon aria-hidden icon={Github01Icon} size={18} strokeWidth={2} />
            github.com/Cobalt-Money/Cobalt
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}

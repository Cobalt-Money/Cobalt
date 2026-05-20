import { AnimatePresence, motion } from "motion/react";

export function PremiseStep({ phase = 0 }: { phase?: number }) {
  return (
    <div className="flex w-full flex-col items-center text-center">
      <h1 className="max-w-md font-semibold text-3xl leading-tight tracking-tight">
        We built Cobalt to be the most productive way to manage your finances.
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
            Cobalt is Fast and Minimal by design
          </motion.h1>
        )}
      </AnimatePresence>
    </div>
  );
}

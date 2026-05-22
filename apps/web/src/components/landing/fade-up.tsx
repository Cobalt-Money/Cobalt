import { motion, useReducedMotion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";

export const LANDING_EASE = [0.22, 1, 0.36, 1] as const;

type FadeUpProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  once?: boolean;
} & Omit<ComponentProps<typeof motion.div>, "initial" | "animate" | "whileInView" | "transition">;

export function FadeUp({
  children,
  delay = 0,
  y = 16,
  duration = 0.6,
  once = true,
  ...rest
}: FadeUpProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div {...(rest as ComponentProps<"div">)}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      transition={{ delay, duration, ease: LANDING_EASE }}
      viewport={{ amount: 0.2, once }}
      whileInView={{ opacity: 1, y: 0 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

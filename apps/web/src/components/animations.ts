import type { Variants } from "framer-motion";

export const fadeIn: Variants = {
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  initial: { opacity: 0 },
};

export const slideFromLeft: Variants = {
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  initial: { opacity: 0, x: -20 },
};

export const slideFromRight: Variants = {
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  initial: { opacity: 0, x: 20 },
};

export const transition = {
  damping: 20,
  stiffness: 200,
  type: "spring",
} as const;

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const buttonHover: Variants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

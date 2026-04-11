import { cn } from "@cobalt-web/ui/lib/utils";
import { cva } from "class-variance-authority";
import { motion } from "framer-motion";

import { transition } from "@/components/animations";
import type { TEventColor } from "@/components/types";

const eventBulletVariants = cva("size-2 rounded-full", {
  defaultVariants: {
    color: "blue",
  },
  variants: {
    color: {
      blue: "bg-blue-600 dark:bg-blue-500",
      gray: "bg-gray-600 dark:bg-gray-500",
      green: "bg-green-600 dark:bg-green-500",
      orange: "bg-orange-600 dark:bg-orange-500",
      purple: "bg-purple-600 dark:bg-purple-500",
      red: "bg-red-600 dark:bg-red-500",
      yellow: "bg-yellow-600 dark:bg-yellow-500",
    },
  },
});

export function EventBullet({
  color,
  className,
}: {
  color: TEventColor;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(eventBulletVariants({ className, color }))}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.2 }}
      transition={transition}
    />
  );
}

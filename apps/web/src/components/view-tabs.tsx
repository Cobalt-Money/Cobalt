import { cn } from "@cobalt-web/ui/lib/utils";
import { Grid02Icon, GridViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, AnimatePresence } from "motion/react";
import { memo } from "react";

import { useCalendar } from "@/components/calendar-context";
import type { TCalendarView } from "@/components/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs = [
  {
    icon: () => <HugeiconsIcon icon={GridViewIcon} size={16} strokeWidth={2} />,
    name: "Month",
    value: "month",
  },
  {
    icon: () => <HugeiconsIcon icon={Grid02Icon} size={16} strokeWidth={2} />,
    name: "Year",
    value: "year",
  },
];

function Views() {
  const { view, setView } = useCalendar();

  return (
    <Tabs
      value={view}
      onValueChange={(value) => setView(value as TCalendarView)}
      className="gap-4 sm:w-auto w-full"
    >
      <TabsList className="h-auto gap-2 rounded-xl p-1 w-full">
        {tabs.map(({ icon: Icon, name, value }) => {
          const isActive = view === value;

          return (
            <motion.div
              key={value}
              layout
              className={cn(
                "flex h-8 items-center justify-center overflow-hidden rounded-md",
                isActive ? "flex-1" : "flex-none"
              )}
              onClick={() => setView(value as TCalendarView)}
              initial={false}
              animate={{
                width: isActive ? 120 : 32,
              }}
              transition={{
                damping: 25,
                stiffness: 400,
                type: "tween",
              }}
            >
              <TabsTrigger
                value={value}
                render={
                  <motion.div
                    className="flex h-8 w-full items-center justify-center cursor-pointer"
                    animate={{ filter: "blur(0px)" }}
                    exit={{ filter: "blur(2px)" }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  />
                }
              >
                <Icon />
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.span
                      className="font-medium"
                      initial={{ opacity: 0, scaleX: 0.8 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{ originX: 0 }}
                    >
                      {name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </TabsTrigger>
            </motion.div>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

export default memo(Views);

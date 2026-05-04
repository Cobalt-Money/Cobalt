import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@cobalt-web/ui/components/card";
import { cn } from "@cobalt-web/ui/lib/utils";
import type { ComponentProps } from "react";

/**
 * Extra surface treatment on top of the stock `Card`: same ghost fill as
 * account cards (`cobalt/accounts/account-card.tsx`). No border or shadow —
 * overrides the stock card ring.
 */
const cobaltCardChrome = "border-0 bg-[oklch(0.949_0_0)] shadow-none ring-0 dark:bg-white/[0.06]";

export type CobaltCardProps = ComponentProps<typeof Card>;

function CobaltCard({ className, ...props }: CobaltCardProps) {
  return <Card className={cn(cobaltCardChrome, className)} {...props} />;
}

export {
  CobaltCard,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cobaltCardChrome,
};

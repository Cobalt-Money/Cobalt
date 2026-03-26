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
 * Extra surface treatment on top of the stock {@link Card}: border-forward
 * chrome, light translucency, and backdrop blur so content reads in layers on
 * `bg-background` / sidebar-inset (vs the stock ring-only edge).
 */
const cobaltCardChrome =
  "ring-0 border border-border/70 bg-card/85 shadow-md backdrop-blur-md";

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

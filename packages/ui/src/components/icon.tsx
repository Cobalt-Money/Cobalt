import { cn } from "@cobalt-web/ui/lib/utils";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";

type IconSize = "xs" | "sm" | "default" | "md" | "lg" | "xl";

const sizeMap: Record<IconSize, string> = {
  xs: "size-3",
  sm: "size-3.5",
  default: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-8",
};

type IconProps = Omit<HugeiconsIconProps, "size"> & {
  size?: IconSize;
};

function Icon({
  className,
  size = "default",
  strokeWidth = 2,
  ...props
}: IconProps) {
  return (
    <HugeiconsIcon
      data-slot="icon"
      strokeWidth={strokeWidth}
      className={cn(sizeMap[size], className)}
      {...props}
    />
  );
}

export { Icon };
export type { IconProps, IconSize };

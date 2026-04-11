import { cn } from "@cobalt-web/ui/lib/utils";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactElement } from "react";
import { Children, cloneElement } from "react";

import type { buttonVariants } from "@/components/ui/button";

/* eslint-disable react/no-clone-element, react/no-react-children -- shadcn-style button composition */

interface ButtonGroupProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
  children: ReactElement<
    ComponentProps<"button"> &
      VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
      }
  >[];
}

export const ButtonGroup = ({
  className,
  orientation = "horizontal",
  children,
}: ButtonGroupProps) => {
  const totalButtons = Children.count(children);
  const isHorizontal = orientation === "horizontal";
  const isVertical = orientation === "vertical";

  return (
    <div
      className={cn(
        "flex",
        {
          "flex-col": isVertical,
          "w-fit": isVertical,
        },
        className
      )}
    >
      {Children.map(children, (child, index) => {
        const isFirst = index === 0;
        const isLast = index === totalButtons - 1;

        return cloneElement(child, {
          className: cn(
            {
              "border-s-0": isHorizontal && !isFirst,
              "border-t-0": isVertical && !isFirst,
              "rounded-b-none": isVertical && !isLast,

              "rounded-e-none": isHorizontal && !isLast,
              "rounded-s-none": isHorizontal && !isFirst,
              "rounded-t-none": isVertical && !isFirst,
            },
            child.props.className
          ),
        });
      })}
    </div>
  );
};

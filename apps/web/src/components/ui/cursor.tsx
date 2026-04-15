import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "motion/react";
import type { HTMLMotionProps, SpringOptions } from "motion/react";
import * as React from "react";

// Inject cursor hiding styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    [data-cursor-hidden="true"],
    [data-cursor-hidden="true"] * {
      cursor: none !important;
    }
  `;
  document.head.append(style);
}

interface CursorContextType {
  cursorPos: { x: number; y: number };
  isActive: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  cursorRef: React.RefObject<HTMLDivElement | null>;
}

const CursorContext = React.createContext<CursorContextType | undefined>(
  undefined
);

const useCursor = (): CursorContextType => {
  const context = React.useContext(CursorContext);
  if (!context) {
    throw new Error("useCursor must be used within a CursorProvider");
  }
  return context;
};

type CursorProviderProps = React.ComponentProps<"div"> & {
  children: React.ReactNode;
};

function CursorProvider(
  { ref, children, ...props }: CursorProviderProps,
  forwardedRef?: React.Ref<HTMLDivElement>
) {
  const [cursorPos, setCursorPos] = React.useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cursorRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(
    forwardedRef || ref,
    () => containerRef.current as HTMLDivElement
  );

  React.useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;

    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setIsActive(true);
    };
    const handleMouseLeave = () => setIsActive(false);

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const contextValue = React.useMemo(
    () => ({ containerRef, cursorPos, cursorRef, isActive }),
    [cursorPos, isActive]
  );

  return (
    <CursorContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        data-slot="cursor-provider"
        data-cursor-hidden={isActive}
        {...props}
      >
        {children}
      </div>
    </CursorContext.Provider>
  );
}

type CursorProps = HTMLMotionProps<"div"> & {
  children: React.ReactNode;
};

function Cursor(
  { ref, children, className, style, ...props }: CursorProps,
  forwardedRef?: React.Ref<HTMLDivElement>
) {
  const { cursorPos, isActive, containerRef, cursorRef } = useCursor();
  React.useImperativeHandle(
    forwardedRef || ref,
    () => cursorRef.current as HTMLDivElement
  );

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  React.useEffect(() => {
    const container = containerRef.current;

    if (container) {
      container.style.cursor = isActive ? "none" : "default";
    }

    return () => {
      if (container) {
        container.style.cursor = "default";
      }
    };
  }, [containerRef, isActive]);

  React.useEffect(() => {
    x.set(cursorPos.x);
    y.set(cursorPos.y);
  }, [cursorPos, x, y]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          ref={cursorRef}
          data-slot="cursor"
          className={cn("pointer-events-none absolute z-[9999]", className)}
          style={{
            left: x,
            top: y,
            transform: "translate(-50%,-50%)",
            ...style,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type Align =
  | "top"
  | "top-left"
  | "top-right"
  | "bottom"
  | "bottom-left"
  | "bottom-right"
  | "left"
  | "right"
  | "center";

type CursorFollowProps = HTMLMotionProps<"div"> & {
  sideOffset?: number;
  align?: Align;
  transition?: SpringOptions;
  children: React.ReactNode;
};

function CursorFollow(
  {
    ref,
    sideOffset = 15,
    align = "bottom-right",
    children,
    className,
    style,
    transition = { bounce: 0, damping: 50, stiffness: 500 },
    ...props
  }: CursorFollowProps,
  forwardedRef?: React.Ref<HTMLDivElement>
) {
  const { cursorPos, isActive, cursorRef } = useCursor();
  const cursorFollowRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(
    forwardedRef || ref,
    () => cursorFollowRef.current as HTMLDivElement
  );

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, transition);
  const springY = useSpring(y, transition);

  const calculateOffset = React.useCallback(() => {
    const rect = cursorFollowRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;

    let newOffset;

    switch (align) {
      case "center": {
        newOffset = { x: width / 2, y: height / 2 };
        break;
      }
      case "top": {
        newOffset = { x: width / 2, y: height + sideOffset };
        break;
      }
      case "top-left": {
        newOffset = { x: width + sideOffset, y: height + sideOffset };
        break;
      }
      case "top-right": {
        newOffset = { x: -sideOffset, y: height + sideOffset };
        break;
      }
      case "bottom": {
        newOffset = { x: width / 2, y: -sideOffset };
        break;
      }
      case "bottom-left": {
        newOffset = { x: width + sideOffset, y: -sideOffset };
        break;
      }
      case "bottom-right": {
        newOffset = { x: -sideOffset, y: -sideOffset };
        break;
      }
      case "left": {
        newOffset = { x: width + sideOffset, y: height / 2 };
        break;
      }
      case "right": {
        newOffset = { x: -sideOffset, y: height / 2 };
        break;
      }
      default: {
        newOffset = { x: 0, y: 0 };
      }
    }

    return newOffset;
  }, [align, sideOffset]);

  React.useEffect(() => {
    const offset = calculateOffset();
    const cursorRect = cursorRef.current?.getBoundingClientRect();
    const cursorWidth = cursorRect?.width ?? 20;
    const cursorHeight = cursorRect?.height ?? 20;

    x.set(cursorPos.x - offset.x + cursorWidth / 2);
    y.set(cursorPos.y - offset.y + cursorHeight / 2);
  }, [calculateOffset, cursorPos, cursorRef, x, y]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          ref={cursorFollowRef}
          data-slot="cursor-follow"
          className={cn("pointer-events-none absolute z-[9998]", className)}
          style={{
            left: springX,
            top: springY,
            transform: "translate(-50%,-50%)",
            ...style,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export {
  CursorProvider,
  Cursor,
  CursorFollow,
  useCursor,
  type CursorContextType,
  type CursorProviderProps,
  type CursorProps,
  type CursorFollowProps,
};

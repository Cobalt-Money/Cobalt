import { Button } from "@cobalt-web/ui/components/button";
import {
  ButtonGroup,
  ButtonGroupText,
} from "@cobalt-web/ui/components/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@cobalt-web/ui/components/tooltip";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  ArrowExpandIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  Copy01Icon,
  Download01Icon,
  Loading02Icon,
  ArrowReloadHorizontalIcon,
  PlusSignIcon,
  MinusSignIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import type { UIMessage } from "ai";
import type { ComponentProps, HTMLAttributes, ReactElement, SVGProps } from "react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Components } from "streamdown";
import { Streamdown } from "streamdown";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full max-w-[95%] flex-col gap-2",
      from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      "is-user:dark flex min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
      "group-[.is-user]:ml-auto group-[.is-user]:w-fit group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
      "group-[.is-assistant]:w-full group-[.is-assistant]:text-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageActionsProps = ComponentProps<"div">;

export const MessageActions = ({
  className,
  children,
  ...props
}: MessageActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props}>
    {children}
  </div>
);

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export const MessageAction = ({
  tooltip,
  children,
  label,
  variant = "ghost",
  size = "icon-sm",
  ...props
}: MessageActionProps) => {
  const button = (
    <Button size={size} type="button" variant={variant} {...props}>
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

interface MessageBranchContextType {
  currentBranch: number;
  totalBranches: number;
  goToPrevious: () => void;
  goToNext: () => void;
  branches: ReactElement[];
  setBranches: (branches: ReactElement[]) => void;
}

const MessageBranchContext = createContext<MessageBranchContextType | null>(
  null
);

const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);

  if (!context) {
    throw new Error(
      "MessageBranch components must be used within MessageBranch"
    );
  }

  return context;
};

export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number;
  onBranchChange?: (branchIndex: number) => void;
};

export const MessageBranch = ({
  defaultBranch = 0,
  onBranchChange,
  className,
  ...props
}: MessageBranchProps) => {
  const [currentBranch, setCurrentBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<ReactElement[]>([]);

  const handleBranchChange = useCallback(
    (newBranch: number) => {
      setCurrentBranch(newBranch);
      onBranchChange?.(newBranch);
    },
    [onBranchChange]
  );

  const goToPrevious = useCallback(() => {
    const newBranch =
      currentBranch > 0 ? currentBranch - 1 : branches.length - 1;
    handleBranchChange(newBranch);
  }, [currentBranch, branches.length, handleBranchChange]);

  const goToNext = useCallback(() => {
    const newBranch =
      currentBranch < branches.length - 1 ? currentBranch + 1 : 0;
    handleBranchChange(newBranch);
  }, [currentBranch, branches.length, handleBranchChange]);

  const contextValue = useMemo<MessageBranchContextType>(
    () => ({
      branches,
      currentBranch,
      goToNext,
      goToPrevious,
      setBranches,
      totalBranches: branches.length,
    }),
    [branches, currentBranch, goToNext, goToPrevious]
  );

  return (
    <MessageBranchContext.Provider value={contextValue}>
      <div
        className={cn("grid w-full gap-2 [&>div]:pb-0", className)}
        {...props}
      />
    </MessageBranchContext.Provider>
  );
};

export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageBranchContent = ({
  children,
  ...props
}: MessageBranchContentProps) => {
  const { currentBranch, setBranches, branches } = useMessageBranch();
  const childrenArray = useMemo(
    () => (Array.isArray(children) ? children : [children]),
    [children]
  );

  // Use useEffect to update branches when they change
  useEffect(() => {
    if (branches.length !== childrenArray.length) {
      setBranches(childrenArray);
    }
  }, [childrenArray, branches, setBranches]);

  return childrenArray.map((branch, index) => (
    <div
      className={cn(
        "grid gap-2 overflow-hidden [&>div]:pb-0",
        index === currentBranch ? "block" : "hidden"
      )}
      key={branch.key}
      {...props}
    >
      {branch}
    </div>
  ));
};

export type MessageBranchSelectorProps = ComponentProps<typeof ButtonGroup>;

export const MessageBranchSelector = ({
  className,
  ...props
}: MessageBranchSelectorProps) => {
  const { totalBranches } = useMessageBranch();

  // Don't render if there's only one branch
  if (totalBranches <= 1) {
    return null;
  }

  return (
    <ButtonGroup
      className={cn(
        "[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md",
        className
      )}
      orientation="horizontal"
      {...props}
    />
  );
};

export type MessageBranchPreviousProps = ComponentProps<typeof Button>;

export const MessageBranchPrevious = ({
  children,
  ...props
}: MessageBranchPreviousProps) => {
  const { goToPrevious, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Previous branch"
      disabled={totalBranches <= 1}
      onClick={goToPrevious}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? (
        <HugeiconsIcon
          className="size-3.5"
          icon={ArrowLeft01Icon}
          strokeWidth={2}
        />
      )}
    </Button>
  );
};

export type MessageBranchNextProps = ComponentProps<typeof Button>;

export const MessageBranchNext = ({
  children,
  ...props
}: MessageBranchNextProps) => {
  const { goToNext, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Next branch"
      disabled={totalBranches <= 1}
      onClick={goToNext}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? (
        <HugeiconsIcon
          className="size-3.5"
          icon={ArrowRight01Icon}
          strokeWidth={2}
        />
      )}
    </Button>
  );
};

export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>;

export const MessageBranchPage = ({
  className,
  ...props
}: MessageBranchPageProps) => {
  const { currentBranch, totalBranches } = useMessageBranch();

  return (
    <ButtonGroupText
      className={cn(
        "border-none bg-transparent text-muted-foreground shadow-none",
        className
      )}
      {...props}
    >
      {currentBranch + 1} of {totalBranches}
    </ButtonGroupText>
  );
};

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = { cjk, code, math, mermaid };

type StreamdownIconProps = SVGProps<SVGSVGElement> & { size?: number };

const makeStreamdownIcon = (icon: IconSvgElement) => {
  const Component = (props: StreamdownIconProps) => {
    const { size = 14, strokeWidth, ...rest } = props;
    return (
      <HugeiconsIcon
        icon={icon}
        size={size}
        strokeWidth={typeof strokeWidth === "number" ? strokeWidth : 2}
        {...rest}
      />
    );
  };
  return Component;
};

const streamdownIcons = {
  CheckIcon: makeStreamdownIcon(Tick01Icon),
  CopyIcon: makeStreamdownIcon(Copy01Icon),
  DownloadIcon: makeStreamdownIcon(Download01Icon),
  ExternalLinkIcon: makeStreamdownIcon(ArrowUpRight01Icon),
  Loader2Icon: makeStreamdownIcon(Loading02Icon),
  Maximize2Icon: makeStreamdownIcon(ArrowExpandIcon),
  RotateCcwIcon: makeStreamdownIcon(ArrowReloadHorizontalIcon),
  XIcon: makeStreamdownIcon(Cancel01Icon),
  ZoomInIcon: makeStreamdownIcon(PlusSignIcon),
  ZoomOutIcon: makeStreamdownIcon(MinusSignIcon),
};

const minimalTableComponents: Components = {
  thead: ({ className, ...props }) => (
    <thead className={cn("border-b border-border", className as string | undefined)} {...props} />
  ),
  tbody: ({ className, ...props }) => (
    <tbody className={className as string | undefined} {...props} />
  ),
  tr: ({ className, ...props }) => (
    <tr className={className as string | undefined} {...props} />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "whitespace-nowrap py-2.5 pr-6 last:pr-0 text-left font-medium text-muted-foreground text-base",
        className as string | undefined
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn("whitespace-nowrap py-2.5 pr-6 last:pr-0 align-top", className as string | undefined)}
      {...props}
    />
  ),
};

const baseStyles = "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1";

const tableOverrides = [
  "[&_[data-streamdown=table-wrapper]]:bg-transparent",
  "[&_[data-streamdown=table-wrapper]]:border-0",
  "[&_[data-streamdown=table-wrapper]]:p-0",
  "[&_[data-streamdown=table-wrapper]]:rounded-none",
  "[&_[data-streamdown=table-wrapper]>div]:overflow-y-visible",
  "[&_[data-streamdown=table-wrapper]>div]:bg-transparent",
  "[&_[data-streamdown=table-wrapper]>div]:border-0",
  "[&_[data-streamdown=table-wrapper]>div]:rounded-none",
  "[&_[data-streamdown=table-header]]:bg-transparent",
  "[&_[data-streamdown=table]]:bg-transparent",
].join(" ");

const codeBlockOverrides = [
  // Outer container: single bordered/rounded surface holding header + body
  "[&_[data-streamdown=code-block]]:bg-input/30",
  "[&_[data-streamdown=code-block]]:border-0",
  "[&_[data-streamdown=code-block]]:rounded-lg",
  "[&_[data-streamdown=code-block]]:px-4",
  "[&_[data-streamdown=code-block]]:pt-1",
  "[&_[data-streamdown=code-block]]:pb-3",
  "[&_[data-streamdown=code-block]]:my-3",
  "[&_[data-streamdown=code-block]]:gap-0",
  "[&_[data-streamdown=code-block]]:relative",
  // Pin the sticky actions row to header level (2nd child div between header + body)
  "[&_[data-streamdown=code-block]>div:nth-child(2)]:absolute",
  "[&_[data-streamdown=code-block]>div:nth-child(2)]:top-1",
  "[&_[data-streamdown=code-block]>div:nth-child(2)]:right-4",
  "[&_[data-streamdown=code-block]>div:nth-child(2)]:mt-0",
  "[&_[data-streamdown=code-block]>div:nth-child(2)]:h-8",
  // Body: transparent — let outer bg show through
  "[&_[data-streamdown=code-block-body]]:bg-transparent",
  "[&_[data-streamdown=code-block-body]]:border-0",
  "[&_[data-streamdown=code-block-body]]:rounded-none",
  "[&_[data-streamdown=code-block-body]]:p-0",
  // Actions chip: flat (no bg, no border, no padding)
  "[&_[data-streamdown=code-block-actions]]:bg-transparent",
  "[&_[data-streamdown=code-block-actions]]:border-0",
  "[&_[data-streamdown=code-block-actions]]:p-0",
  "[&_[data-streamdown=code-block-actions]]:backdrop-blur-none",
  // Header lang span has ml-1 by default; align with body's left edge (line numbers)
  "[&_[data-streamdown=code-block-header]>span]:ml-0",
  // Inline code
  "[&_[data-streamdown=inline-code]]:bg-muted/60",
  "[&_[data-streamdown=inline-code]]:px-1",
  "[&_[data-streamdown=inline-code]]:py-0.5",
].join(" ");

export const MessageResponse = memo(
  ({ className, components, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(baseStyles, tableOverrides, codeBlockOverrides, className)}
      components={{ ...minimalTableComponents, ...components }}
      icons={streamdownIcons}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    nextProps.isAnimating === prevProps.isAnimating
);

MessageResponse.displayName = "MessageResponse";

export type MessageToolbarProps = ComponentProps<"div">;

export const MessageToolbar = ({
  className,
  children,
  ...props
}: MessageToolbarProps) => (
  <div
    className={cn(
      "mt-4 flex w-full items-center justify-between gap-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

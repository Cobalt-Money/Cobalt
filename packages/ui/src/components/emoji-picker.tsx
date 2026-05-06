import { EmojiPicker as EmojiPickerPrimitive } from "frimousse";
import type { ComponentProps } from "react";

import { cn } from "../lib/utils";

function EmojiPicker({
  className,
  ...props
}: ComponentProps<typeof EmojiPickerPrimitive.Root>) {
  return (
    <EmojiPickerPrimitive.Root
      className={cn("isolate flex h-[342px] w-fit flex-col bg-popover", className)}
      {...props}
    />
  );
}

function EmojiPickerSearch({
  className,
  ...props
}: ComponentProps<typeof EmojiPickerPrimitive.Search>) {
  return (
    <div className="flex h-9 items-center gap-2 border-b px-3">
      <EmojiPickerPrimitive.Search
        className={cn(
          "flex w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground",
          className,
        )}
        placeholder="Search emojis…"
        {...props}
      />
    </div>
  );
}

function EmojiPickerContent({
  className,
  ...props
}: ComponentProps<typeof EmojiPickerPrimitive.Viewport>) {
  return (
    <EmojiPickerPrimitive.Viewport
      className={cn("relative flex-1 outline-hidden", className)}
      {...props}
    >
      <EmojiPickerPrimitive.Loading className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </EmojiPickerPrimitive.Loading>
      <EmojiPickerPrimitive.Empty className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
        No emoji found.
      </EmojiPickerPrimitive.Empty>
      <EmojiPickerPrimitive.List
        className="select-none pb-1.5"
        components={{
          CategoryHeader: ({ category, ...rest }) => (
            <div
              className="bg-popover px-3 pt-3 pb-1.5 font-medium text-muted-foreground text-xs"
              {...rest}
            >
              {category.label}
            </div>
          ),
          Row: ({ children, ...rest }) => (
            <div className="scroll-my-1.5 px-1.5" {...rest}>
              {children}
            </div>
          ),
          Emoji: ({ emoji, ...rest }) => (
            <button
              className="flex size-7 items-center justify-center rounded-md text-base data-[active]:bg-accent"
              {...rest}
            >
              {emoji.emoji}
            </button>
          ),
        }}
      />
    </EmojiPickerPrimitive.Viewport>
  );
}

export { EmojiPicker, EmojiPickerContent, EmojiPickerSearch };

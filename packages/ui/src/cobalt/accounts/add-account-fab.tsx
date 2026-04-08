import { Button } from "@cobalt-web/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AppleStocksIcon,
  CreditCardIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

const ADD_OPTIONS = [
  {
    description:
      "Checking, savings, credit, and crypto — linked with Plaid, same as your bank app.",
    id: "plaid" as const,
    title: "Bank & cards",
  },
  {
    description:
      "Investment and retirement accounts via SnapTrade, separate from day-to-day banking.",
    id: "snaptrade" as const,
    title: "Brokerage",
  },
] as const;

/**
 * Primary floating action to add accounts. Menu reflects Cobalt’s two connection
 * stacks (Plaid vs SnapTrade). Optional `onChoose` for when flows are wired.
 *
 * Motion follows emil-design-eng: strong ease-out, scale press, enter from ~0.95,
 * `origin-bottom-right`, reduced-motion safe.
 */
export function AccountsAddAccountFab({
  onChoose,
}: {
  onChoose?: (id: (typeof ADD_OPTIONS)[number]["id"]) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            aria-expanded={menuOpen}
            aria-label="Add account"
            className={cn(
              "fixed right-4 bottom-6 z-40 size-14 rounded-full shadow-lg lg:right-8 lg:bottom-8",
              "origin-bottom-right",
              "animate-in fade-in-0 zoom-in-95 duration-200 [animation-timing-function:cubic-bezier(0.23,1,0.32,1)]",
              "motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:scale-100",
              "transition-[transform,opacity] duration-150 will-change-transform [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
              "active:scale-[0.97] active:translate-y-0",
              menuOpen && "shadow-xl",
              "[@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.03]"
            )}
            type="button"
            variant="default"
          />
        }
      >
        <HugeiconsIcon
          aria-hidden
          className={cn(
            "size-7 transition-transform duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
            menuOpen && "rotate-45"
          )}
          icon={PlusSignIcon}
          strokeWidth={2}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(calc(100vw-2rem),22rem)] rounded-2xl p-0"
        side="top"
        sideOffset={8}
      >
        <div className="px-1 pt-2 pb-1">
          <DropdownMenuLabel className="px-3 py-2 font-normal">
            <span className="block text-sm font-semibold text-foreground">
              Add account
            </span>
            <span className="mt-0.5 block text-xs leading-snug font-normal text-muted-foreground">
              Pick how you want to connect — banking uses Plaid, brokerage uses
              SnapTrade.
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ADD_OPTIONS.map((opt) => (
            <DropdownMenuItem
              className="mx-1 mb-1 flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 last:mb-0"
              key={opt.id}
              onSelect={() => {
                onChoose?.(opt.id);
              }}
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground">
                <HugeiconsIcon
                  aria-hidden
                  className="size-5"
                  icon={opt.id === "plaid" ? CreditCardIcon : AppleStocksIcon}
                  strokeWidth={2}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground">
                  {opt.title}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                  {opt.description}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { cn } from "@cobalt-web/ui/lib/utils";
import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useState } from "react";

/** Ids passed to `onChoose` — wire credit/bank/savings to Plaid, brokerage to SnapTrade. */
export type AddAccountFabOptionId = "credit" | "bank" | "savings" | "brokerage";

const ADD_OPTIONS: readonly { id: AddAccountFabOptionId; label: string }[] = [
  { id: "credit", label: "Credit" },
  { id: "bank", label: "Bank" },
  { id: "savings", label: "Savings" },
  { id: "brokerage", label: "Brokerage" },
];

/** Shared width for expanded stack (pills + close). */
const FAB_STACK_WIDTH_CLASS = "w-[min(100vw-2rem,11rem)]";

/**
 * Same surface as command palette (`bg-input/30`, hover, focus ring) but
 * **circular** (`rounded-full`) and **foreground** text — no muted palette.
 */
const fabRowClass =
  "box-border flex h-9 w-full min-h-9 max-h-9 min-w-0 shrink-0 cursor-pointer items-center justify-center rounded-full bg-input/30 px-3 text-sm font-medium text-foreground transition-colors outline-none [-webkit-tap-highlight-color:transparent] hover:bg-input/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/** Collapsed + control: larger circular hit target, same input surface. */
const fabTriggerClass =
  "flex size-14 shrink-0 items-center justify-center rounded-full bg-input/30 text-foreground transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-input/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/**
 * Floating action to add accounts: tap + to reveal a vertical stack of pill
 * actions (Plaid vs SnapTrade) and a close control — similar to a speed-dial FAB.
 * Optional `onChoose` when flows are wired. Animations can be layered on later.
 */
export function AccountsAddAccountFab({
  onChoose,
  onClickUnified,
}: {
  onChoose?: (id: AddAccountFabOptionId) => void;
  /**
   * When provided, tapping the FAB skips the speed-dial stack and immediately
   * calls this handler — used by the unified Add Account dialog flow.
   */
  onClickUnified?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const close = useCallback(() => {
    setExpanded(false);
  }, []);

  useEffect(() => {
    if (!expanded) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, expanded]);

  const choose = useCallback(
    (id: AddAccountFabOptionId) => {
      onChoose?.(id);
      setExpanded(false);
    },
    [onChoose],
  );

  return (
    <div
      className={cn(
        "fixed right-4 bottom-6 z-40 flex flex-col items-end gap-2 lg:right-8 lg:bottom-8",
      )}
      role={expanded ? "group" : undefined}
      aria-label={expanded ? "Add account options" : undefined}
    >
      {expanded ? (
        <div className={cn("flex flex-col gap-2", FAB_STACK_WIDTH_CLASS)}>
          {ADD_OPTIONS.map((opt) => (
            <button
              className={fabRowClass}
              key={opt.id}
              type="button"
              onClick={() => {
                choose(opt.id);
              }}
            >
              {opt.label}
            </button>
          ))}
          <button
            aria-label="Close add account options"
            className={fabRowClass}
            type="button"
            onClick={close}
          >
            <HugeiconsIcon aria-hidden className="size-5" icon={Cancel01Icon} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          aria-expanded={expanded}
          aria-haspopup="true"
          aria-label="Add account"
          className={cn(
            fabTriggerClass,
            "origin-bottom-right",
            "animate-in fade-in-0 zoom-in-95 duration-200 [animation-timing-function:cubic-bezier(0.23,1,0.32,1)]",
            "motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:scale-100",
          )}
          type="button"
          onClick={() => {
            if (onClickUnified) {
              onClickUnified();
              return;
            }
            setExpanded(true);
          }}
        >
          <HugeiconsIcon aria-hidden className="size-7" icon={PlusSignIcon} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

import { Button } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

import { CobaltDialog } from "../cobalt-dialog";

export interface CashAccountFormValues {
  name: string;
  /** Current balance in dollars; null means user left it blank. */
  startingBalance: number | null;
}

export interface AddCashAccountFormProps {
  onSubmit: (values: CashAccountFormValues) => void;
  submitting?: boolean;
  /** Fires when user hits Backspace with empty name input. Used by command palette to "morph back". */
  onBackspaceWhenEmpty?: () => void;
  submitLabel?: string;
  autoFocus?: boolean;
}

export interface AddCashAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CashAccountFormValues) => void;
  submitting?: boolean;
  /** Fires when user hits Backspace with empty name input. Used by command palette to "morph back". */
  onBackspaceWhenEmpty?: () => void;
}

export function AddCashAccountForm({
  onSubmit,
  submitting = false,
  onBackspaceWhenEmpty,
  submitLabel = "Create account",
  autoFocus = true,
}: AddCashAccountFormProps) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName("");
    setBalance("");
    if (!autoFocus) {
      return;
    }
    // Double-RAF: lets cmdk's own focus management (when embedded as a
    // command-palette sub-page) settle before we grab focus.
    let secondId = 0;
    const id = window.requestAnimationFrame(() => {
      secondId = window.requestAnimationFrame(() => {
        titleRef.current?.focus();
      });
    });
    return () => {
      window.cancelAnimationFrame(id);
      if (secondId) {
        window.cancelAnimationFrame(secondId);
      }
    };
  }, [autoFocus]);

  const trimmed = name.trim();
  const canSubmit = !submitting && trimmed.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    const parsed = balance.trim() === "" ? null : Number(balance);
    onSubmit({
      name: trimmed,
      startingBalance:
        parsed !== null && Number.isFinite(parsed) ? parsed : null,
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <input
        aria-label="Account name"
        className="w-full min-w-0 cursor-text bg-transparent font-semibold text-2xl text-foreground leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50"
        maxLength={255}
        onChange={(e) => {
          setName(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && name === "" && onBackspaceWhenEmpty) {
            e.preventDefault();
            onBackspaceWhenEmpty();
          }
        }}
        placeholder="Wallet, Travel Cash, Emergency Fund…"
        ref={titleRef}
        value={name}
      />
      <div className="flex items-baseline gap-0.5">
        <span
          className={cn(
            "text-lg tabular-nums",
            balance.trim() === ""
              ? "text-muted-foreground/50"
              : "text-foreground"
          )}
        >
          $
        </span>
        <input
          aria-label="Current balance"
          className="min-w-0 flex-1 cursor-text bg-transparent text-lg text-foreground tabular-nums outline-none placeholder:text-muted-foreground/50"
          inputMode="decimal"
          min={0}
          onChange={(e) => {
            setBalance(e.target.value);
          }}
          placeholder="0.00"
          step="0.01"
          type="number"
          value={balance}
        />
      </div>
      <div className="mt-auto flex justify-end pt-2">
        <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
          {submitting ? "Creating…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function AddCashAccountDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
  onBackspaceWhenEmpty,
}: AddCashAccountDialogProps) {
  return (
    <CobaltDialog
      className="min-h-[240px] w-[720px] sm:max-w-3xl"
      onOpenChange={onOpenChange}
      open={open}
      title="New Cash Account"
    >
      <AddCashAccountForm
        key={open ? "open" : "closed"}
        onBackspaceWhenEmpty={onBackspaceWhenEmpty}
        onSubmit={onSubmit}
        submitting={submitting}
      />
    </CobaltDialog>
  );
}

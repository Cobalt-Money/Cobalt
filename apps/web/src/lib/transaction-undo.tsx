import { Kbd, KbdGroup } from "@cobalt-web/ui/components/kbd";
import { UndoManager } from "@rocicorp/undo";
import type { UndoRedoStackState } from "@rocicorp/undo";
import { useHotkeys } from "@tanstack/react-hotkeys";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export interface UndoableAction {
  /** Rich content shown in the initial action toast. */
  label: ReactNode;
  forward: () => void;
  inverse: () => void;
  /** When true, run forward only and skip pushing onto the stack. */
  skip?: boolean;
}

interface TransactionUndoContextValue {
  push: (action: UndoableAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const ACTION_BUTTON_STYLE: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "inherit",
};

const TOAST_ID = "txn-undo";

const noop = () => {
  /* placeholder until first render assigns the real fn into the ref */
};

const isMac =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || "");
const MOD_KEY = isMac ? "⌘" : "Ctrl";
const SHIFT_KEY = isMac ? "⇧" : "Shift";

function kbdLabel(text: string, keys: readonly string[]) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {text}
      <KbdGroup>
        {keys.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </KbdGroup>
    </span>
  );
}

const TransactionUndoContext = createContext<TransactionUndoContextValue | null>(null);

export function TransactionUndoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UndoRedoStackState>({
    canRedo: false,
    canUndo: false,
  });
  const mgr = useMemo(() => new UndoManager({ onChange: setState }), []);

  const undoRef = useRef<() => void>(noop);
  const redoRef = useRef<() => void>(noop);

  const showRevertedToast = useCallback(() => {
    toast("Reverted", {
      action: mgr.canRedo
        ? {
            label: kbdLabel("Redo", [MOD_KEY, SHIFT_KEY, "Z"]),
            onClick: () => redoRef.current(),
          }
        : undefined,
      actionButtonStyle: ACTION_BUTTON_STYLE,
      id: TOAST_ID,
    });
  }, [mgr]);

  const showReappliedToast = useCallback(() => {
    toast("Reapplied", {
      action: mgr.canUndo
        ? {
            label: kbdLabel("Undo", [MOD_KEY, "Z"]),
            onClick: () => undoRef.current(),
          }
        : undefined,
      actionButtonStyle: ACTION_BUTTON_STYLE,
      id: TOAST_ID,
    });
  }, [mgr]);

  const undo = useCallback(async () => {
    if (!mgr.canUndo) {
      return;
    }
    await mgr.undo();
    showRevertedToast();
  }, [mgr, showRevertedToast]);

  const redo = useCallback(async () => {
    if (!mgr.canRedo) {
      return;
    }
    await mgr.redo();
    showReappliedToast();
  }, [mgr, showReappliedToast]);

  undoRef.current = () => void undo();
  redoRef.current = () => void redo();

  const push = useCallback(
    (action: UndoableAction) => {
      if (action.skip) {
        action.forward();
        return;
      }
      void mgr.add({
        execute: () => action.forward(),
        undo: () => action.inverse(),
      });
      toast(action.label, {
        action: {
          label: kbdLabel("Undo", [MOD_KEY, "Z"]),
          onClick: () => undoRef.current(),
        },
        actionButtonStyle: ACTION_BUTTON_STYLE,
        id: TOAST_ID,
      });
    },
    [mgr],
  );

  useHotkeys(
    [
      {
        callback: () => undoRef.current(),
        hotkey: "Mod+Z",
        options: { meta: { description: "Undo last change", name: "Undo" } },
      },
      {
        callback: () => redoRef.current(),
        hotkey: "Mod+Shift+Z",
        options: { meta: { description: "Redo last change", name: "Redo" } },
      },
      {
        callback: () => redoRef.current(),
        hotkey: "Mod+Y",
        options: { meta: { description: "Redo last change", name: "Redo" } },
      },
    ],
    { ignoreInputs: true },
  );

  const value = useMemo<TransactionUndoContextValue>(
    () => ({
      canRedo: state.canRedo,
      canUndo: state.canUndo,
      push,
      redo: () => void redo(),
      undo: () => void undo(),
    }),
    [push, redo, state.canRedo, state.canUndo, undo],
  );

  return (
    <TransactionUndoContext.Provider value={value}>{children}</TransactionUndoContext.Provider>
  );
}

export function useTransactionUndo(): TransactionUndoContextValue {
  const ctx = useContext(TransactionUndoContext);
  if (!ctx) {
    throw new Error("useTransactionUndo must be used within TransactionUndoProvider");
  }
  return ctx;
}

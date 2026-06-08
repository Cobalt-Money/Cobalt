import { queries } from "@cobalt-web/zero";
import { TransactionDetailSummary } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail-summary";
import { mapZeroTransactionDetailRow } from "@cobalt-web/ui/cobalt/transactions/lib/dto";
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { useQuery } from "@rocicorp/zero/react";
import { useState } from "react";
import type { GlassStyle, PinDatum } from "./types";

export function TxnDetailPanel({
  txnId,
  mode,
  onClose,
  glassStyle,
  stack,
  selfId,
  onNavigate,
}: {
  txnId: string;
  mode: "pinned" | "preview";
  onClose: () => void;
  glassStyle: GlassStyle;
  stack: PinDatum[] | null;
  selfId: string | undefined;
  onNavigate: (p: PinDatum) => void;
}) {
  const { style, textClass, mutedClass } = glassStyle;
  const isLight = textClass === "text-black";
  const [row] = useQuery(queries.transactions.detail({ transactionId: txnId }));
  const mapped = row ? mapZeroTransactionDetailRow(row) : null;
  const transaction = mapped?.transaction ?? null;
  const [offset, setOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const handleDragEnd = (e: DragEndEvent) => {
    setOffset((prev) => ({ x: prev.x + e.delta.x, y: prev.y + e.delta.y }));
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <DraggableTxnPanel
        offset={offset}
        mode={mode}
        onClose={onClose}
        textClass={textClass}
        style={style}
        isLight={isLight}
        mutedClass={mutedClass}
        transaction={transaction}
        stack={stack}
        selfId={selfId}
        currentId={txnId}
        onNavigate={onNavigate}
      />
    </DndContext>
  );
}

function DraggableTxnPanel({
  offset,
  mode,
  onClose,
  textClass,
  style,
  isLight,
  mutedClass,
  transaction,
  stack,
  selfId,
  currentId,
  onNavigate,
}: {
  offset: { x: number; y: number };
  mode: "pinned" | "preview";
  onClose: () => void;
  textClass: string;
  style: React.CSSProperties;
  isLight: boolean;
  mutedClass: string;
  transaction: NonNullable<ReturnType<typeof mapZeroTransactionDetailRow>>["transaction"] | null;
  stack: PinDatum[] | null;
  selfId: string | undefined;
  currentId: string;
  onNavigate: (p: PinDatum) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "txn-detail-panel",
  });
  const dx = offset.x + (transform?.x ?? 0);
  const dy = offset.y + (transform?.y ?? 0);

  const hasStack = !!(stack && stack.length > 0);
  const scrollClass = `[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ${
    isLight
      ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
      : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20"
  } [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full`;
  const fmtDate = (d: string | number | null) => {
    if (!d) {
      return "";
    }
    const dt = new Date(d);
    return Number.isNaN(dt.getTime())
      ? ""
      : dt.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  const isPreview = mode === "preview";
  return (
    <div
      ref={isPreview ? undefined : setNodeRef}
      className={`fixed bottom-4 right-[18rem] z-20 max-w-[calc(100vw-2rem)] ${hasStack ? "w-[38rem]" : "w-[26rem]"} ${isPreview ? "pointer-events-none" : ""}`}
      style={{ transform: `translate3d(${dx}px, ${dy}px, 0)` }}
    >
      <div className={`relative rounded-2xl border ${textClass}`} style={style}>
        {!isPreview && (
          <>
            <div
              {...listeners}
              {...attributes}
              className="absolute left-0 right-10 top-0 h-7 cursor-grab touch-none select-none rounded-t-2xl active:cursor-grabbing"
              aria-hidden
            />
            <button
              type="button"
              onClick={onClose}
              className={`absolute right-3 top-3 z-10 size-7 rounded-full text-sm transition ${isLight ? "hover:bg-black/10" : "hover:bg-white/10"}`}
            >
              ✕
            </button>
          </>
        )}
        <div className="flex h-[20rem]">
          {hasStack && stack && (
            <nav
              className={`w-40 shrink-0 overflow-y-auto border-r py-3 pl-3 pr-2 ${scrollClass} ${isLight ? "border-black/10" : "border-white/10"}`}
            >
              <ul className="flex flex-col gap-1">
                {stack.map((p) => {
                  const active = p.id === currentId;
                  let cls: string;
                  if (active) {
                    cls = isLight ? "bg-black/10" : "bg-white/15";
                  } else {
                    cls = isLight ? "hover:bg-black/5" : "hover:bg-white/10";
                  }
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(p)}
                        className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition ${cls}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">
                            {fmtDate(p.date) || p.merchant}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            ${Math.abs(p.amount).toFixed(2)}
                          </span>
                        </div>
                        {p.userId !== selfId && (
                          <div className={`truncate ${mutedClass}`}>{p.person}</div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
          <div className={`flex-1 overflow-y-auto px-4 py-3 ${scrollClass}`} style={{ zoom: 0.85 }}>
            {transaction ? (
              <div className="flex flex-col gap-6">
                <TransactionDetailSummary transaction={transaction} hideLocationMap />
                {transaction.notes && (
                  <div className="flex flex-col gap-2">
                    <h2 className="font-medium text-foreground text-base">Notes</h2>
                    <div className="whitespace-pre-wrap text-foreground text-base leading-relaxed">
                      {transaction.notes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`py-6 text-center text-sm ${mutedClass}`}>Loading transaction…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

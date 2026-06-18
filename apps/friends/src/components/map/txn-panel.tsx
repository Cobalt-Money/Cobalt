import { queries } from "@cobalt-web/zero";
import { useMutator } from "@cobalt-web/ui/cobalt/hooks/use-mutator";
import { deriveCategorySection } from "@cobalt-web/ui/cobalt/transactions/detail/editable-category";
import type { TransactionDetailEditHandlers } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail-summary";
import { TransactionDetailSummary } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail-summary";
import { TransactionNotes } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-notes";
import { mapZeroTransactionDetailRow } from "@cobalt-web/ui/cobalt/transactions/lib/dto";
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo, useState } from "react";
import { useMerchantSearch } from "../../hooks/use-merchant-search";
import { mapSharedPostToTransaction } from "./map-shared-txn";
import type { GlassStyle, PinDatum } from "./types";

function renderNotesBlock(notes: string | null, edit: TransactionDetailEditHandlers | undefined) {
  if (edit) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="font-medium text-foreground text-base">Notes</h2>
        <TransactionNotes notes={notes} onReset={edit.onResetNotes} onUpdate={edit.onUpdateNotes} />
      </div>
    );
  }
  if (!notes) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-medium text-foreground text-base">Notes</h2>
      <div className="whitespace-pre-wrap text-foreground text-base leading-relaxed">{notes}</div>
    </div>
  );
}

export function TxnDetailPanel({
  txnId,
  mode,
  onClose,
  glassStyle,
  stack,
  selfId,
  onNavigate,
  person,
  personAvatarUrl,
  editable,
  friendIds,
}: {
  txnId: string;
  mode: "pinned" | "preview";
  onClose: () => void;
  glassStyle: GlassStyle;
  stack: PinDatum[] | null;
  selfId: string | undefined;
  onNavigate: (p: PinDatum) => void;
  person: string | null;
  personAvatarUrl: string | null;
  /** True when the viewer owns this txn (authed + own row). Enables inline edits. */
  editable: boolean;
  /** Friend graph ids — required to load shared txn detail for non-owned pins. */
  friendIds: string[];
}) {
  const { style, textClass, mutedClass } = glassStyle;
  const isLight = textClass === "text-black";
  const [ownRow] = useQuery(queries.transactions.detail({ transactionId: txnId }));
  const [sharedPost] = useQuery(
    queries.social.postByTransactionId({ friendIds, transactionId: txnId }),
  );
  const mapped = ownRow ? mapZeroTransactionDetailRow(ownRow) : null;
  const transaction = editable
    ? (mapped?.transaction ?? null)
    : sharedPost
      ? mapSharedPostToTransaction(sharedPost)
      : null;
  const edit = useTxnEditHandlers(txnId, transaction, editable);
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
        person={person}
        personAvatarUrl={personAvatarUrl}
        edit={edit}
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
  person,
  personAvatarUrl,
  edit,
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
  person: string | null;
  personAvatarUrl: string | null;
  edit: TransactionDetailEditHandlers | undefined;
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
      <div
        className={`relative rounded-2xl border ${textClass}`}
        style={
          isLight
            ? ({
                ...style,
                "--foreground": "oklch(0.145 0 0)",
                "--muted-foreground": "oklch(0.4 0 0)",
              } as React.CSSProperties)
            : style
        }
      >
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
          <div className={`flex-1 overflow-y-auto px-4 py-3 ${scrollClass}`}>
            {transaction ? (
              <div className="flex flex-col gap-6">
                <div style={{ zoom: 0.85 }}>
                  <TransactionDetailSummary
                    transaction={transaction}
                    hideLocationMap
                    person={person}
                    personAvatarUrl={personAvatarUrl}
                    edit={edit}
                  />
                </div>
                {renderNotesBlock(transaction.notes, edit)}
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

/**
 * Inline edit handlers for the friends txn detail panel. Mirrors the web
 * route's handler bundle, but minus the undo/toast wrappers + tag picker +
 * geocoding (the panel-sized surface here only exposes the basics). Anon
 * callers always get `undefined` since the underlying mutators reject them.
 */
function useTxnEditHandlers(
  txnId: string,
  transaction: NonNullable<ReturnType<typeof mapZeroTransactionDetailRow>>["transaction"] | null,
  editable: boolean,
): TransactionDetailEditHandlers | undefined {
  const mutate = useMutator();
  const [merchantQuery, setMerchantQuery] = useState("");
  const { data: merchantResults = [], isFetching: merchantLoading } =
    useMerchantSearch(merchantQuery);
  const [categoryRows] = useQuery(queries.categories.list());
  const categoryOptions = useMemo(
    () =>
      categoryRows.map((cat) => {
        const groupSystemKey = cat.group?.systemKey ?? null;
        return {
          groupName: cat.group?.name ?? "",
          groupSystemKey,
          iconKey: cat.iconKey,
          id: cat.id,
          name: cat.name,
          sectionKey: deriveCategorySection(groupSystemKey),
        };
      }),
    [categoryRows],
  );

  return useMemo<TransactionDetailEditHandlers | undefined>(() => {
    if (!editable) {
      return;
    }
    const uid = () => crypto.randomUUID();
    const run = (build: Parameters<typeof mutate>[0], label: string): void => {
      mutate(build, `Couldn't save ${label}. Please try again.`);
    };

    return {
      availableTags: [],
      categoryOptions,
      merchantSearch: {
        loading: merchantLoading,
        onQueryChange: setMerchantQuery,
        results: merchantResults.map((r) => ({
          brandId: r.brandId,
          domain: r.domain,
          icon: r.icon,
          name: r.name,
        })),
      },
      onDelete:
        transaction?.source === "manual"
          ? () => {
              run((m) => m.transaction.deleteTransaction({ id: txnId }), "deletion");
            }
          : undefined,
      onResetCategory: () => {
        run((m) => m.transaction.resetCategory({ editId: uid(), id: txnId }), "category");
      },
      onResetDate: () => {
        run((m) => m.transaction.resetDate({ editId: uid(), id: txnId }), "date");
      },
      onResetLocation: () => {
        run((m) => m.transaction.resetLocation({ editId: uid(), id: txnId }), "location");
      },
      onResetNotes: () => {
        run((m) => m.transaction.resetNotes({ editId: uid(), id: txnId }), "notes");
      },
      onResetPaymentChannel: () => {
        run(
          (m) => m.transaction.resetPaymentChannel({ editId: uid(), id: txnId }),
          "payment channel",
        );
      },
      onUpdateCategory: ({ categoryId }) => {
        run(
          (m) => m.transaction.updateCategory({ categoryId, editId: uid(), id: txnId }),
          "category",
        );
      },
      onUpdateDate: (date) => {
        run((m) => m.transaction.updateDate({ date, editId: uid(), id: txnId }), "date");
      },
      onUpdateLocation: (location) => {
        run(
          (m) => m.transaction.updateLocation({ editId: uid(), id: txnId, location }),
          "location",
        );
      },
      onUpdateMerchant: ({ merchantName, website }) => {
        run(
          (m) => m.transaction.updateMerchant({ editId: uid(), id: txnId, merchantName, website }),
          "merchant",
        );
      },
      onUpdateName: (name) => {
        run((m) => m.transaction.updateName({ editId: uid(), id: txnId, name }), "name");
      },
      onUpdateNotes: (notes) => {
        run((m) => m.transaction.updateNotes({ editId: uid(), id: txnId, notes }), "notes");
      },
      onUpdatePaymentChannel: (paymentChannel) => {
        run(
          (m) => m.transaction.updatePaymentChannel({ editId: uid(), id: txnId, paymentChannel }),
          "payment channel",
        );
      },
      tagIds: null,
    };
  }, [
    editable,
    categoryOptions,
    transaction?.source,
    txnId,
    mutate,
    merchantLoading,
    merchantResults,
  ]);
}

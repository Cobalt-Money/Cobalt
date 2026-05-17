import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { importsApi } from "@/lib/clients/api-client";

export interface StagedRow {
  amount: string;
  date: string;
  id: string;
  merchant: string;
  notes: string | null;
  originalDescription: string | null;
  parseError: string | null;
  sourceAccountName: string;
  sourceCategoryName: string | null;
  tags: string[];
}

/** Fields the server accepts on PATCH /imports/:id/staged-rows/:rowId. */
export type PersistableKey = "amount" | "date" | "merchant" | "notes" | "originalDescription";

export type EditPatch = Partial<Pick<StagedRow, PersistableKey>>;

export interface ResolutionsShape {
  singleAccountId: string | null;
  accountByLabel: Record<string, string>;
  categoryByLabel: Record<string, string>;
}

/**
 * Caller-facing per-cell binding. Wire into an `<input>` as
 * `value={b.value ?? ""} onChange={(e) => b.onChange(e.target.value)} onBlur={b.onBlur}`.
 * Validation runs on blur — invalid input reverts to last server value.
 */
export interface CellBinding {
  value: string | null;
  onChange: (next: string) => void;
  onBlur: () => void;
}

/** Date picker binding. No blur — persist fires on `onSelect`. */
export interface DateBinding {
  value: string;
  onSelect: (iso: string) => void;
}

/** Local-only picker binding for account / category. No persistence today (per-row resolution has no schema). */
export interface PickerBinding {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Per-key validators that mirror the server's `updateStagedRowBodySchema` so an invalid intermediate (e.g. "1.", "") doesn't trigger a save+reject flicker. */
const INTERMEDIATE_TYPING_GUARDS: Partial<Record<PersistableKey, RegExp>> = {
  amount: /^-?\d*\.?\d*$/, // permissive: allows "-", "1.", "" while typing
};
const FINAL_VALIDATORS: Partial<Record<PersistableKey, (v: string | null) => boolean>> = {
  amount: (v) => v !== null && /^-?\d+(\.\d+)?$/.test(v),
  date: (v) => v !== null && /^\d{4}-\d{2}-\d{2}$/.test(v),
  merchant: (v) => v !== null && v.trim() !== "",
};

function dropEditKeys(
  prev: Map<string, EditPatch>,
  rowId: string,
  keys: PersistableKey[],
): Map<string, EditPatch> {
  const current = prev.get(rowId);
  if (!current) {
    return prev;
  }
  const remaining = Object.fromEntries(
    Object.entries(current).filter(([k]) => !keys.includes(k as PersistableKey)),
  ) as EditPatch;
  const next = new Map(prev);
  if (Object.keys(remaining).length === 0) {
    next.delete(rowId);
  } else {
    next.set(rowId, remaining);
  }
  return next;
}

/**
 * Overlay state for the staged-row spreadsheet. Server data (`baseRows`) is the
 * source of truth; local edits live in three overlay maps and are merged at render.
 *
 * Persistence asymmetry:
 *   - Text cell edits + date picks → PATCH on settle; cleared from overlay after
 *     refetch returns the new server-confirmed value.
 *   - Account / category overrides → local-only. Per-row resolution has no schema
 *     today (deferred SRI follow-up); defaults still come from per-label resolutions.
 */
export function useStagedRowOverlay({
  jobId,
  baseRows,
  resolutions,
}: {
  jobId: string;
  baseRows: StagedRow[];
  resolutions: ResolutionsShape | undefined;
}) {
  const [editsById, setEditsById] = useState<Map<string, EditPatch>>(new Map());
  const [accountOverride, setAccountOverride] = useState<Map<string, string>>(new Map());
  const [categoryOverride, setCategoryOverride] = useState<Map<string, string>>(new Map());
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: { rowId: string; patch: EditPatch }) => {
      const res = await importsApi[":id"]["staged-rows"][":rowId"].$patch({
        json: input.patch,
        param: { id: jobId, rowId: input.rowId },
      });
      if (!res.ok) {
        throw new Error("Failed to save edit");
      }
      return await res.json();
    },
    onError: (_err, input) => {
      setEditsById((prev) =>
        dropEditKeys(prev, input.rowId, Object.keys(input.patch) as PersistableKey[]),
      );
    },
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({
        queryKey: ["import-job", jobId, "staged-rows"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["import-job", jobId, "staged-preview"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["import-job", jobId, "status"],
      });
      setEditsById((prev) =>
        dropEditKeys(prev, input.rowId, Object.keys(input.patch) as PersistableKey[]),
      );
    },
  });

  // Merge server rows with un-persisted local edits.
  const rows: StagedRow[] = baseRows.map((r) => {
    const edit = editsById.get(r.id);
    return edit ? { ...r, ...edit } : r;
  });

  const baseById = useMemo(() => new Map(baseRows.map((r) => [r.id, r] as const)), [baseRows]);

  const setEdit = useCallback((rowId: string, key: PersistableKey, value: string | null) => {
    setEditsById((prev) => {
      const next = new Map(prev);
      const current = next.get(rowId) ?? {};
      next.set(rowId, { ...current, [key]: value });
      return next;
    });
  }, []);

  /** Settle a cell: validate, persist if changed and valid, revert if invalid. */
  const settleCell = useCallback(
    (rowId: string, key: PersistableKey) => {
      const merged = baseById.get(rowId);
      if (!merged) {
        return;
      }
      const edit = editsById.get(rowId);
      const cur = edit && key in edit ? (edit[key] ?? null) : (merged[key] as string | null);
      const base = merged[key] as string | null;
      if (cur === base) {
        return;
      }
      const isValid = FINAL_VALIDATORS[key]?.(cur) ?? true;
      if (!isValid) {
        setEditsById((prev) => dropEditKeys(prev, rowId, [key]));
        return;
      }
      const patch: EditPatch =
        key === "amount" || key === "date" || key === "merchant"
          ? { [key]: cur as string }
          : { [key]: cur };
      mutation.mutate({ patch, rowId });
    },
    [baseById, editsById, mutation],
  );

  const bindCell = useCallback(
    (rowId: string, key: PersistableKey): CellBinding => {
      const merged = rows.find((r) => r.id === rowId);
      const value = (merged?.[key] ?? null) as string | null;
      return {
        onBlur: () => settleCell(rowId, key),
        onChange: (next: string) => {
          const guard = INTERMEDIATE_TYPING_GUARDS[key];
          // Reject obviously-bad characters mid-typing (amount: non-numeric).
          if (guard && next !== "" && !guard.test(next)) {
            return;
          }
          setEdit(rowId, key, next);
        },
        value,
      };
    },
    [rows, setEdit, settleCell],
  );

  const bindDate = useCallback(
    (rowId: string): DateBinding => {
      const merged = rows.find((r) => r.id === rowId);
      return {
        onSelect: (iso: string) => {
          setEdit(rowId, "date", iso);
          mutation.mutate({ patch: { date: iso }, rowId });
        },
        value: merged?.date ?? "",
      };
    },
    [rows, setEdit, mutation],
  );

  const accountFor = useCallback(
    (row: StagedRow): string | null => {
      const override = accountOverride.get(row.id);
      if (override) {
        return override;
      }
      const fromResolution =
        resolutions?.singleAccountId ?? resolutions?.accountByLabel[row.sourceAccountName];
      if (!fromResolution || fromResolution === "skip") {
        return null;
      }
      return fromResolution;
    },
    [accountOverride, resolutions],
  );

  const categoryFor = useCallback(
    (row: StagedRow): string | null => {
      const override = categoryOverride.get(row.id);
      if (override) {
        return override;
      }
      if (!row.sourceCategoryName) {
        return null;
      }
      return resolutions?.categoryByLabel[row.sourceCategoryName] ?? null;
    },
    [categoryOverride, resolutions],
  );

  const bindAccount = useCallback(
    (rowId: string): PickerBinding => {
      const row = rows.find((r) => r.id === rowId);
      return {
        onSelect: (id: string) => {
          setAccountOverride((prev) => new Map(prev).set(rowId, id));
        },
        selectedId: row ? accountFor(row) : null,
      };
    },
    [rows, accountFor],
  );

  const bindCategory = useCallback(
    (rowId: string): PickerBinding => {
      const row = rows.find((r) => r.id === rowId);
      return {
        onSelect: (id: string) => {
          setCategoryOverride((prev) => new Map(prev).set(rowId, id));
        },
        selectedId: row ? categoryFor(row) : null,
      };
    },
    [rows, categoryFor],
  );

  return {
    accountFor,
    bindAccount,
    bindCategory,
    bindCell,
    bindDate,
    categoryFor,
    rows,
  };
}

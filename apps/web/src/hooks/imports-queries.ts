import { queryOptions } from "@tanstack/react-query";

import { importsApi } from "@/lib/clients/api-client";

/**
 * Query factories for the CSV import pipeline. One key shape: `["import-job", jobId, <slot>]`.
 * Mutation factories live at their call sites (TanStack convention — mutations are
 * usually one-off and benefit from local context like rollback handlers).
 */

const importJobKey = (jobId: string, slot: string) => ["import-job", jobId, slot] as const;

/** Job status — workflow phase, summary, rejected counts. Polled live during commit. */
export const importStatus = (jobId: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await importsApi[":id"].$get({ param: { id: jobId } });
      if (!res.ok) {
        throw new Error("Failed to load import status");
      }
      return await res.json();
    },
    queryKey: importJobKey(jobId, "status"),
  });

/** Full staged-row set for the expanded preview's mini-spreadsheet. */
export const importStagedRows = (jobId: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await importsApi[":id"]["staged-rows"].$get({
        param: { id: jobId },
      });
      if (!res.ok) {
        throw new Error("Failed to load staged rows");
      }
      return await res.json();
    },
    queryKey: importJobKey(jobId, "staged-rows"),
  });

/** A handful of staged rows for the commit-screen sanity preview. */
export const importStagedPreview = (jobId: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await importsApi[":id"]["staged-preview"].$get({
        param: { id: jobId },
      });
      if (!res.ok) {
        throw new Error("Failed to load staged preview");
      }
      return await res.json();
    },
    queryKey: importJobKey(jobId, "staged-preview"),
  });

/** Confirmed account + category decisions for an import, including pending creates. */
export const importResolutions = (jobId: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await importsApi[":id"].resolutions.$get({
        param: { id: jobId },
      });
      if (!res.ok) {
        throw new Error("Failed to load import resolutions");
      }
      return await res.json();
    },
    queryKey: importJobKey(jobId, "resolutions"),
  });

/** Suggested column mapping for Step 2. AI-inferred or cache-hit. */
export const importColumnMap = (jobId: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await importsApi[":id"]["column-map"].$get({
        param: { id: jobId },
      });
      if (!res.ok) {
        throw new Error("Failed to load column mapping suggestion");
      }
      return await res.json();
    },
    queryKey: importJobKey(jobId, "column-map"),
  });

/** Account-mapping suggestions for Step 3 (Path A) or default for Path B. */
export const importAccountMap = (jobId: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await importsApi[":id"]["account-map"].$get({
        param: { id: jobId },
      });
      if (!res.ok) {
        throw new Error("Failed to load account mapping suggestion");
      }
      return await res.json();
    },
    queryKey: importJobKey(jobId, "account-map"),
  });

/** Category-mapping suggestions for Step 4. */
export const importCategoryMap = (jobId: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await importsApi[":id"]["category-map"].$get({
        param: { id: jobId },
      });
      if (!res.ok) {
        throw new Error("Failed to load category mapping suggestion");
      }
      return await res.json();
    },
    queryKey: importJobKey(jobId, "category-map"),
  });

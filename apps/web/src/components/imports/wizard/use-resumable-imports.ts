import { useQuery } from "@tanstack/react-query";

import { importsApi } from "@/lib/clients/api-client";

export interface ResumableJob {
  id: string;
  originalFilename: string;
  status: "uploaded" | "column_mapped" | "account_mapped" | "category_mapped" | "committing";
  createdAt: string;
}

export const RESUMABLE_STEP_LABEL: Record<ResumableJob["status"], string> = {
  account_mapped: "Map categories",
  category_mapped: "Review & commit",
  column_mapped: "Map accounts",
  committing: "Importing…",
  uploaded: "Map columns",
};

export function useResumableImports() {
  return useQuery<{ jobs: ResumableJob[] }>({
    queryFn: async () => {
      const res = await importsApi.list.$get();
      if (!res.ok) {
        throw new Error("Failed to load resumable imports");
      }
      return (await res.json()) as { jobs: ResumableJob[] };
    },
    queryKey: ["resumable-imports"],
  });
}

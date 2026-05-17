import type { ImportStatusResponse } from "@cobalt-web/server-data/import/shared/schemas";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { useQuery } from "@tanstack/react-query";

import { importsApi } from "@/lib/clients/api-client";

export function useImportFailureWatcher(jobId: string | null, onTerminal: () => void) {
  useQuery<ImportStatusResponse | null>({
    enabled: jobId !== null,
    queryFn: async () => {
      if (!jobId) {
        return null;
      }
      const res = await importsApi[":id"].$get({ param: { id: jobId } });
      if (!res.ok) {
        throw new Error("Import job not found");
      }
      const data = (await res.json()) as ImportStatusResponse;
      if (data.status === "failed") {
        cobaltToast.error(
          data.errorMessage ? `Import failed: ${data.errorMessage}` : "Import failed.",
        );
        onTerminal();
      } else if (data.status === "cancelled") {
        onTerminal();
      } else if (data.status === "committed") {
        onTerminal();
      }
      return data;
    },
    queryKey: ["import-failure-watcher", jobId],
    refetchInterval: 2000,
  });
}

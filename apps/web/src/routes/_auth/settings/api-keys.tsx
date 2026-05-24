import type { ApiKey } from "@better-auth/api-key/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/lib/clients/auth-client";

export const Route = createFileRoute("/_auth/settings/api-keys")({
  component: ApiKeysRoute,
});

// Server never returns the hashed secret on list; strip it from the plugin's
// canonical type rather than hand-rolling a row shape that drifts.
type ApiKeyRow = Omit<ApiKey, "key">;

const apiKeysQueryKey = ["apiKeys"] as const;

function ApiKeysRoute() {
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryFn: async () => {
      const res = await authClient.apiKey.list();
      return (res.data ?? []) as ApiKeyRow[];
    },
    queryKey: apiKeysQueryKey,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey });

  const createKey = useMutation({
    mutationFn: (name: string) => authClient.apiKey.create({ name }),
    onSuccess: (res) => {
      if (res.data?.key) {
        setRevealedKey(res.data.key);
      }
      setNewKeyName("");
      void invalidate();
    },
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => authClient.apiKey.update({ enabled: false, keyId: id }),
    onSuccess: () => invalidate(),
  });

  const deleteKey = useMutation({
    mutationFn: (id: string) => authClient.apiKey.delete({ keyId: id }),
    onSuccess: () => invalidate(),
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-semibold text-2xl">API keys</h1>
        <p className="text-muted-foreground text-sm">
          Bearer tokens for the Cobalt public API. Treat like passwords.
        </p>
      </header>

      {revealedKey && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="font-medium text-sm">Copy this key now. It won't be shown again.</p>
          <code className="mt-2 block break-all rounded bg-background p-2 font-mono text-xs">
            {revealedKey}
          </code>
          <button
            className="mt-2 text-muted-foreground text-xs underline"
            onClick={() => setRevealedKey(null)}
            type="button"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name (e.g. production-server)"
          value={newKeyName}
        />
        <button
          className="rounded-md bg-foreground px-3 py-2 text-background text-sm disabled:opacity-50"
          disabled={!newKeyName.trim() || createKey.isPending}
          onClick={() => createKey.mutate(newKeyName.trim())}
          type="button"
        >
          Create key
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {!isLoading && keys.length === 0 && (
          <p className="text-muted-foreground text-sm">No keys yet.</p>
        )}
        {keys.map((k) => (
          <div
            className="flex items-center justify-between rounded-md border p-3 text-sm"
            key={k.id}
          >
            <div className="flex flex-col">
              <span className="font-medium">{k.name ?? "Unnamed"}</span>
              <span className="font-mono text-muted-foreground text-xs">
                {k.prefix}
                {k.start}…
              </span>
            </div>
            <div className="flex gap-2">
              {k.enabled !== false && (
                <button
                  className="text-muted-foreground text-xs hover:text-foreground"
                  onClick={() => revokeKey.mutate(k.id)}
                  type="button"
                >
                  Revoke
                </button>
              )}
              <button
                className="text-destructive text-xs"
                onClick={() => deleteKey.mutate(k.id)}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

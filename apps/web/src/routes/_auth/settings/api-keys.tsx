import type { ApiKey } from "@better-auth/api-key/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@cobalt-web/ui/components/alert-dialog";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { Button } from "@cobalt-web/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@cobalt-web/ui/components/dialog";
import { Icon } from "@cobalt-web/ui/components/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cobalt-web/ui/components/table";
import {
  Alert02Icon,
  Copy01Icon,
  Delete02Icon,
  Key01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/clients/auth-client";

export const Route = createFileRoute("/_auth/settings/api-keys")({
  component: ApiKeysRoute,
});

// Server never returns the hashed secret on list; strip it from the plugin's
// canonical type rather than hand-rolling a row shape that drifts.
type ApiKeyRow = Omit<ApiKey, "key">;

const apiKeysQueryKey = ["apiKeys"] as const;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value: Date | string | number | null | undefined): string {
  if (!value) {
    return "—";
  }
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateFormatter.format(d);
}

// Mirrors Better Auth's default `maximumNameLength`. Hard-coded here so the
// input's `maxLength` can enforce it client-side too — server-side validation
// still runs as the source of truth.
const MAX_KEY_NAME_LENGTH = 32;

function ApiKeysRoute() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryFn: async () => {
      // Better Auth 1.7+ paginated shape: `{ data: { apiKeys, total, ... } }`.
      // Earlier versions returned a bare array under `data` — handle both
      // so the dashboard doesn't break if the package gets downgraded.
      const res = await authClient.apiKey.list();
      const payload = res.data as ApiKeyRow[] | { apiKeys?: ApiKeyRow[] } | null | undefined;
      if (Array.isArray(payload)) {
        return payload;
      }
      return payload?.apiKeys ?? [];
    },
    queryKey: apiKeysQueryKey,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey });

  const revokeKey = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      authClient.apiKey.update({ enabled: false, keyId: id }),
    onError: () => cobaltToast.error("Couldn't revoke API key. Please try again."),
    onSuccess: (_res, { name }) => {
      cobaltToast.apiKeyRevoked(name);
      invalidate();
    },
  });

  const deleteKey = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => authClient.apiKey.delete({ keyId: id }),
    onError: () => cobaltToast.error("Couldn't delete API key. Please try again."),
    onSuccess: (_res, { name }) => {
      cobaltToast.apiKeyDeleted(name);
      invalidate();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-semibold text-2xl">API keys</h1>
        <Button className="w-fit" onClick={() => setDialogOpen(true)} size="sm" variant="outline">
          <HugeiconsIcon icon={Key01Icon} size={15} strokeWidth={2} />
          Create key
        </Button>
      </header>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-0 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && keys.length === 0 && (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No API keys yet.
                </TableCell>
              </TableRow>
            )}
            {keys.map((k) => {
              const name = k.name ?? "Unnamed";
              const revoked = k.enabled === false;
              return (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">
                    {name}
                    {revoked && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
                        Revoked
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">
                    {k.prefix}
                    {k.start}…
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(k.lastRequest)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(k.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      {!revoked && (
                        <button
                          className="text-muted-foreground text-xs hover:text-foreground"
                          onClick={() => revokeKey.mutate({ id: k.id, name })}
                          type="button"
                        >
                          Revoke
                        </button>
                      )}
                      <DeleteKeyButton
                        keyId={k.id}
                        keyName={name}
                        onConfirm={() => deleteKey.mutate({ id: k.id, name })}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AddApiKeyDialog onOpenChange={setDialogOpen} onSuccess={invalidate} open={dialogOpen} />
    </div>
  );
}

interface DeleteKeyButtonProps {
  keyId: string;
  keyName: string;
  onConfirm: () => void;
}

/**
 * Trash-icon trigger + AlertDialog confirmation. Mirrors the
 * `DeleteAccountDialog` pattern (destructive AlertDialog with explicit
 * Cancel + Delete) but skipped the typed-confirmation gate — a stray
 * delete on a single API key is recoverable (issue a new one), unlike a
 * full account wipe.
 */
function DeleteKeyButton({ keyId: _keyId, keyName, onConfirm }: DeleteKeyButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <button
            aria-label={`Delete API key ${keyName}`}
            className="rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            type="button"
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />
          </button>
        }
      />
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
            Delete API key
          </AlertDialogTitle>
          <AlertDialogDescription>
            Delete <span className="font-medium text-foreground">{keyName}</span>? Anything using
            this key will stop working right away. You can't undo this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface AddApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires after the key row is committed server-side so the parent list refetches. */
  onSuccess: () => void;
}

/**
 * Two-step dialog: name input → reveal-once secret. Mirrors the layout/feel
 * of `AddTagDialog` in the UI package for the name step (icon + bold input
 * + submit row). The secret-reveal step is dialog-only by design — the
 * page never holds the plaintext key (per security policy: plaintext key
 * lives in memory for exactly one dismissable view).
 *
 * Kept inline (not in `packages/ui`) because it's only used here. Promote
 * if a second consumer shows up.
 */
function AddApiKeyDialog({ onOpenChange, onSuccess, open }: AddApiKeyDialogProps) {
  // Inner is conditionally rendered so it remounts on every open — fresh
  // state per session, no reset effect needed. Per React docs: prefer
  // remount over `useEffect` to reset state on prop change.
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      {open && <AddApiKeyDialogInner onClose={() => onOpenChange(false)} onSuccess={onSuccess} />}
    </Dialog>
  );
}

interface AddApiKeyDialogInnerProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddApiKeyDialogInner({ onClose, onSuccess }: AddApiKeyDialogInnerProps) {
  const [name, setName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const createKey = useMutation({
    mutationFn: (n: string) => authClient.apiKey.create({ name: n }),
    onError: () => cobaltToast.error("Couldn't create API key. Please try again."),
    onSuccess: (res, n) => {
      if (res.data?.key) {
        setRevealedKey(res.data.key);
      }
      cobaltToast.apiKeyCreated(n);
      onSuccess();
    },
  });

  // Focus after the dialog mount + Base UI focus-trap settles. Double RAF
  // = wait two paints so our focus() runs after the trap's initial focus.
  useEffect(() => {
    let secondId = 0;
    const id = window.requestAnimationFrame(() => {
      secondId = window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    });
    return () => {
      window.cancelAnimationFrame(id);
      window.cancelAnimationFrame(secondId);
    };
  }, []);

  const trimmed = name.trim();
  const canSubmit =
    !createKey.isPending && trimmed.length > 0 && trimmed.length <= MAX_KEY_NAME_LENGTH;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    createKey.mutate(trimmed);
  };

  return (
    <>
      <DialogContent className="min-h-[240px] w-[460px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon={Key01Icon} size="md" />
            {revealedKey ? "API key created" : "New API key"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {revealedKey ? (
            <div className="flex flex-1 flex-col gap-4">
              <p className="text-muted-foreground text-sm">
                Copy and store this key safely. Anyone with access to it can read your financial
                data. Cobalt can never move money, so transfers are never at risk.
              </p>
              <button
                aria-label="Copy API key to clipboard"
                className="group flex items-start gap-2 rounded border bg-muted p-3 text-left transition hover:bg-muted/70"
                onClick={async () => {
                  // `navigator.clipboard` is undefined on insecure origins
                  // (http+non-localhost). Optional-chain so we don't crash;
                  // toast surfaces the failure either way.
                  try {
                    await navigator.clipboard?.writeText(revealedKey);
                    setCopied(true);
                    toast.success("API key copied to clipboard");
                    // Revert icon after a beat so the button can re-confirm
                    // on a second click without page reload.
                    window.setTimeout(() => setCopied(false), 2000);
                  } catch {
                    toast.error("Couldn't copy — copy it manually");
                  }
                }}
                type="button"
              >
                <code className="block flex-1 break-all font-mono text-xs">{revealedKey}</code>
                <HugeiconsIcon
                  aria-hidden
                  className="mt-0.5 shrink-0 text-muted-foreground transition group-hover:text-foreground"
                  icon={copied ? Tick02Icon : Copy01Icon}
                  size={14}
                  strokeWidth={2}
                />
              </button>
              <div className="mt-auto flex justify-end pt-2">
                <Button onClick={onClose} type="button">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4">
              <input
                aria-label="API key name"
                className="w-full min-w-0 cursor-text bg-transparent font-semibold text-2xl text-foreground leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50"
                maxLength={MAX_KEY_NAME_LENGTH}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="COBALT_API_KEY"
                ref={inputRef}
                value={name}
              />

              <div className="mt-auto flex justify-end pt-2">
                <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
                  {createKey.isPending ? "Creating…" : "Create key"}
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </>
  );
}

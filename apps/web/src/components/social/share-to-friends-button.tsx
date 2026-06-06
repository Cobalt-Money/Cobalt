import { mutators } from "@cobalt-web/zero";
import { useZero } from "@rocicorp/zero/react";
import { useState } from "react";

interface ShareToFriendsButtonProps {
  transactionId: string;
  /** True when caller has already shared this txn — flips button to "Unshare". */
  existingPostId: string | null;
}

/**
 * Drop into the transaction detail action row. Writes a `social_post` row
 * via Zero mutator; the friends app picks it up via `queries.social.postsFeed`.
 *
 * Idempotent (unique on `(userId, transactionId)`): re-share is a no-op,
 * unshare deletes the post.
 */
export function ShareToFriendsButton({ transactionId, existingPostId }: ShareToFriendsButtonProps) {
  const z = useZero();
  const [busy, setBusy] = useState(false);

  const isShared = Boolean(existingPostId);

  const label = busy ? buildBusyLabel(isShared) : buildIdleLabel(isShared);

  const onClick = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await z.mutate(
        isShared && existingPostId
          ? mutators.social.posts.delete({ postId: existingPostId })
          : mutators.social.posts.create({
              amountMode: "exact",
              id: crypto.randomUUID(),
              transactionId,
            }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
        isShared
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
          : "border-border bg-background hover:bg-accent"
      }`}
      disabled={busy}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function buildBusyLabel(isShared: boolean): string {
  return isShared ? "Unsharing…" : "Sharing…";
}

function buildIdleLabel(isShared: boolean): string {
  return isShared ? "Shared with friends · Unshare" : "Share to friends";
}

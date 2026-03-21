import type { Zero } from "@rocicorp/zero";

let activeZero: Zero | undefined;

/**
 * Tracks the Zero instance under {@link ZeroProvider} so sign-out can call
 * {@link Zero.delete} and clear the local replica (Rocicorp guidance).
 */
export function registerActiveZeroForLogout(z: Zero): void {
  activeZero = z;
}

/**
 * Deletes IndexedDB data for the active Zero instance when present (e.g. user
 * signs out while `/transactions` is mounted). Safe to call when no Zero exists.
 */
export async function deleteActiveZeroReplicaOnLogout(): Promise<void> {
  const z = activeZero;
  if (!z || z.closed) {
    return;
  }
  await z.delete();
  if (activeZero === z) {
    activeZero = undefined;
  }
}

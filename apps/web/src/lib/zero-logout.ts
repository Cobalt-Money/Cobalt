import type { Zero } from "@rocicorp/zero";

import { authClient } from "@/lib/clients/auth-client";

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
 * signs out while Zero-backed routes are mounted). Safe to call when no Zero exists.
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

/** Signs the user out and clears the local Zero replica. */
export async function logout(): Promise<void> {
  await authClient.signOut();
  await deleteActiveZeroReplicaOnLogout();
}

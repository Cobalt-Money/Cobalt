import { useEffect, useState } from "react";

import { userApi } from "./api-client";

export interface FriendProfile {
  id: string;
  name: string | null;
  image: string | null;
  displayUsername: string | null;
}

const cache = new Map<string, FriendProfile>();
const inflight = new Set<string>();

/**
 * Resolve display profiles for a list of user ids via the friendProfiles
 * REST endpoint and cache them across the session. Returns a Map keyed by id
 * that grows as requests resolve. Re-renders the host component when the
 * cache picks up new entries.
 */
export function useFriendProfiles(ids: readonly string[]): Map<string, FriendProfile> {
  const [, bump] = useState(0);

  const missing = ids.filter((id) => !cache.has(id) && !inflight.has(id));
  const key = missing.toSorted().join(",");

  useEffect(() => {
    if (missing.length === 0) {
      return;
    }
    for (const id of missing) {
      inflight.add(id);
    }
    void (async () => {
      try {
        const res = await userApi.friendProfiles.$post({ json: { ids: missing } });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        for (const p of data.profiles) {
          cache.set(p.id, p);
        }
        bump((n) => n + 1);
      } finally {
        for (const id of missing) {
          inflight.delete(id);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const out = new Map<string, FriendProfile>();
  for (const id of ids) {
    const hit = cache.get(id);
    if (hit) {
      out.set(id, hit);
    }
  }
  return out;
}

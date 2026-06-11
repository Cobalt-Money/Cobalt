/**
 * Demo identity surfaced to unauthenticated callers. When `ctx.userId` is
 * absent, social queries fall back to this id so the friends app renders
 * a seeded sample network (map, friend list, posts) for landing-page SEO
 * and product-preview UX. Mutators still reject anon callers — read-only.
 *
 * Seeded by `apps/friends/scripts/seed-demo.ts`. If you change this id,
 * re-run the seed.
 */
export const DEMO_USER_ID = "demo-pocketwatch-root";

/**
 * Demo network member ids. `postsAll` scopes its anon result to this set
 * so anon callers can't read arbitrary `social_post` rows. Must include
 * DEMO_USER_ID + every seeded friend.
 */
export const DEMO_NETWORK_IDS = [
  DEMO_USER_ID,
  "demo-friend-ava",
  "demo-friend-ben",
  "demo-friend-cleo",
  "demo-friend-dax",
  "demo-friend-eli",
] as const;

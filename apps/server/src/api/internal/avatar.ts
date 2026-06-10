import { getUserAvatarUrl } from "@cobalt-web/server-data/user/queries";
import { Hono } from "hono";

/**
 * Avatar proxy. Browser hits `/api/avatar/:userId`, server resolves the
 * upstream URL from `user.image` (typically `lh3.googleusercontent.com`),
 * fetches the bytes, and returns them with cache headers tuned for the
 * Vercel edge CDN — which dedups, stores, and revalidates across regions.
 *
 * Why proxy at all: Google rotates avatar tokens, sometimes drops CORS
 * headers, and blocks based on Referer — all of which break the friends
 * map canvas pipeline. Proxying eliminates those failure modes because
 * Node has no CORS and we control the response headers.
 */

async function fetchAvatar(
  url: string,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const res = await fetch(url, {
    headers: { Accept: "image/*" },
    redirect: "follow",
  });
  if (!res.ok) {
    return null;
  }
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const bytes = await res.arrayBuffer();
  return { bytes, contentType };
}

export const avatarRouter = new Hono().get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const image = await getUserAvatarUrl(userId);
  const result = image ? await fetchAvatar(image) : null;
  if (!result) {
    return new Response(null, {
      headers: {
        // Cache misses at edge too so we don't re-hit origin per nav.
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
      status: 404,
    });
  }
  return new Response(result.bytes, {
    headers: {
      // Browser: 1h. Vercel edge: 24h. Serve stale up to 7d while revalidating.
      // s-maxage tells the CDN to cache independently of browser max-age.
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Type": result.contentType,
    },
  });
});

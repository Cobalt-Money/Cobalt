/**
 * Cobalt sandbox CF Worker.
 *
 * Thin wrapper around `@tanstack/ai-isolate-cloudflare/worker`. The upstream
 * handler does not authenticate requests; the README explicitly tells
 * consumers to "validate auth headers server-side if you set `authorization`
 * in the driver" and to "put the Worker behind authentication, rate limiting,
 * and CORS restrictions" before rollout. This wrapper supplies that layer:
 *
 *   1. Requires `Authorization: Bearer ${env.AUTH_TOKEN}` on every call. Without
 *      this the worker URL is a public arbitrary-JS executor billed to our CF
 *      account (egress is already blocked by the upstream `globalOutbound: null`,
 *      so the risk is $$$ / DoS rather than data exfil).
 *   2. Fails closed if `AUTH_TOKEN` is unset.
 *   3. Rejects CORS preflights — this endpoint is server-to-server only.
 *   4. Strips the upstream wildcard CORS headers from successful responses so
 *      browsers cannot read them cross-origin even if the preflight check is
 *      bypassed.
 *
 * The upstream handler still does the real work: loads user code into a fresh
 * isolate via the `worker_loader` (Dynamic Workers) binding with
 * `globalOutbound: null` and `env: {}` so the loaded code has no network
 * access and no bindings.
 */

import tanstackWorker from "@tanstack/ai-isolate-cloudflare/worker";

interface Env {
  AUTH_TOKEN?: string;
  LOADER?: unknown;
  RATE_LIMITER?: RateLimit;
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 405 });
    }
    if (req.method !== "POST") {
      return Response.json({ error: "method_not_allowed" }, { status: 405 });
    }

    const expected = env.AUTH_TOKEN;
    if (!expected) {
      return Response.json({ error: "auth_not_configured" }, { status: 503 });
    }
    if (req.headers.get("authorization") !== `Bearer ${expected}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    // Edge rate limit per source IP. Applied after auth so anonymous traffic
    // is already shed and the binding cost only counts authenticated callers.
    // `cf-connecting-ip` is the Cloudflare-trusted client IP (XFF-equivalent
    // headers are unsafe — clients can forge them).
    if (env.RATE_LIMITER) {
      const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) {
        return Response.json({ error: "rate_limited" }, { status: 429 });
      }
    }

    // Cast: TanStack's internal `Env` type narrows `LOADER` to its own
    // (non-exported) `WorkerLoader` interface. Runtime shape matches; this is
    // a type-only widening.
    const upstream = await tanstackWorker.fetch(
      req,
      env as Parameters<typeof tanstackWorker.fetch>[1],
      ctx,
    );
    const headers = new Headers(upstream.headers);
    headers.delete("access-control-allow-origin");
    headers.delete("access-control-allow-methods");
    headers.delete("access-control-allow-headers");
    return new Response(upstream.body, {
      headers,
      status: upstream.status,
      statusText: upstream.statusText,
    });
  },
};

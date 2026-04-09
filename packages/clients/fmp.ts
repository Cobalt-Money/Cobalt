import { env } from "@cobalt-web/env/server";

const BASE = "https://financialmodelingprep.com/stable";

export type FmpSearchParams = Record<
  string,
  string | number | boolean | undefined
>;

/**
 * GET `https://financialmodelingprep.com/stable/{path}` with `apikey` and optional query params.
 * @throws If `FMP_API_KEY` is unset or the response is not OK / not JSON.
 */
export async function fmpStableGet(
  path: string,
  params: FmpSearchParams = {}
): Promise<unknown> {
  const apiKey = env.FMP_API_KEY;
  if (!apiKey) {
    throw new Error("FMP_API_KEY is not configured");
  }

  const url = new URL(`${BASE}/${path.replace(/^\//, "")}`);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "Cobalt-Financial-App/1.0",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    if (typeof o["Error Message"] === "string") {
      throw new TypeError(`FMP API error: ${o["Error Message"]}`);
    }
    if (typeof o.error === "string") {
      throw new TypeError(`FMP API error: ${o.error}`);
    }
  }

  return data;
}

import { env } from "@cobalt-web/env/server";

const BASE_URL = "https://www.alphavantage.co/query";

export async function alphaVantageRequest(
  params: Record<string, string | number>
): Promise<unknown> {
  const url = new URL(BASE_URL);
  url.searchParams.set("apikey", env.ALPHA_VANTAGE_API_KEY);
  url.searchParams.set("entitlement", "delayed");

  for (const [key, value] of Object.entries(params)) {
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
    throw new Error(
      `Alpha Vantage API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (data["Error Message"]) {
    throw new Error(`Alpha Vantage API error: ${data["Error Message"]}`);
  }
  if (data["Note"]) {
    throw new Error(`Alpha Vantage API note: ${data["Note"]}`);
  }
  if (data["Information"]) {
    throw new Error(`Alpha Vantage API info: ${data["Information"]}`);
  }

  return data;
}

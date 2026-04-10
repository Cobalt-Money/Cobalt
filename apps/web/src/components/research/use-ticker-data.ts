import { env } from "@cobalt-web/env/web";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ChartPeriod } from "@/components/research/lightweight-price-chart";

// ── Types ─────────────────────────────────────────────────────────

export interface TickerQuote {
  change: number;
  changePercent: number;
  companyName: string;
  currentPrice: number;
}

interface ChartApiPoint {
  close?: number;
  high?: number;
  id?: string;
  low?: number;
  open?: number;
  price: number;
  time: string;
  volume: number;
}

export interface ChartPoint {
  time: number;
  value: number;
}

// ── Fetch helper ──────────────────────────────────────────────────

const BASE = env.VITE_SERVER_URL;

async function apiFetch<T>(
  path: string,
  params: Record<string, string> = {},
  signal?: AbortSignal
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), { credentials: "include", signal });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Unknown error";
}

// ── Chart data conversion ─────────────────────────────────────────

function toChartPoints(apiData: ChartApiPoint[]): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const d of apiData) {
    const date = new Date(d.time);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    points.push({
      time: Math.floor(date.getTime() / 1000),
      value: d.price,
    });
  }
  return points;
}

// ── Hook: Quote ───────────────────────────────────────────────────

export function useQuote(symbol: string) {
  const [data, setData] = useState<TickerQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await apiFetch<TickerQuote>(
          "/api/research/quote",
          { symbol },
          controller.signal
        );
        setData(res);
      } catch (error) {
        if (!isAbort(error)) {
          setFetchError(errorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    run();
    return () => controller.abort();
  }, [symbol]);

  return { data, error: fetchError, loading };
}

// ── Hook: Overview ────────────────────────────────────────────────

export function useOverview(symbol: string) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await apiFetch<Record<string, unknown>>(
          "/api/research/overview",
          { symbol },
          controller.signal
        );
        setData(res);
      } catch (error) {
        if (!isAbort(error)) {
          setFetchError(errorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    run();
    return () => controller.abort();
  }, [symbol]);

  return { data, error: fetchError, loading };
}

// ── Hook: Chart ───────────────────────────────────────────────────

export function useChart(symbol: string, timePeriod: ChartPeriod) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchChart = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setFetchError(null);

    try {
      const json = await apiFetch<{ data: ChartApiPoint[] }>(
        "/api/research/chart",
        { symbol, timePeriod },
        controller.signal
      );
      if (!controller.signal.aborted) {
        setData(toChartPoints(json.data));
      }
    } catch (error) {
      if (!isAbort(error) && !controller.signal.aborted) {
        setFetchError(errorMessage(error));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [symbol, timePeriod]);

  useEffect(() => {
    fetchChart();
    return () => controllerRef.current?.abort();
  }, [fetchChart]);

  return { data, error: fetchError, loading };
}

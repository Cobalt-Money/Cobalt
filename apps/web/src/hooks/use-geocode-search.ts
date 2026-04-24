import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { transactionsApi } from "@/lib/clients/api-client";

const SEARCH_DEBOUNCE_MS = 350;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debouncedValue;
}

export interface GeocodeResult {
  displayName: string;
  location: {
    address: string | null;
    city: string | null;
    country: string | null;
    lat: number | null;
    lon: number | null;
    postal_code: string | null;
    region: string | null;
    store_number: string | null;
  };
}

/** Free-text geocoding via Nominatim (proxied through our `/transactions/geocode` endpoint). */
export function useGeocodeSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  return useQuery({
    enabled: debounced.length >= 2,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<GeocodeResult[]> => {
      const res = await transactionsApi.geocode.$get({
        query: { q: debounced },
      });
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      return data.results;
    },
    queryKey: ["transactions", "geocode", debounced] as const,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });
}

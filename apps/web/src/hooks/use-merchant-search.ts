import { brandfetchSearch } from "@cobalt-web/clients/brandfetch";
import type { BrandfetchSearchResult } from "@cobalt-web/clients/brandfetch";
import { env } from "@cobalt-web/env/web";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const SEARCH_DEBOUNCE_MS = 200;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debouncedValue;
}

export type MerchantSuggestion = BrandfetchSearchResult;

/** Brandfetch Brand Search typeahead (free tier with VITE_BRANDFETCH_CLIENT_ID). */
export function useMerchantSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const clientId = env.VITE_BRANDFETCH_CLIENT_ID?.trim() ?? "";
  return useQuery({
    enabled: clientId.length > 0 && debounced.length >= 2,
    gcTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }): Promise<MerchantSuggestion[]> =>
      await brandfetchSearch(debounced, clientId, { signal }),
    queryKey: ["brandfetch", "search", debounced] as const,
    retry: 1,
    staleTime: 1000 * 60 * 10,
  });
}

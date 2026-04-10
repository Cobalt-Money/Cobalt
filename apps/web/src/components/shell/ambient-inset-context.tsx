import { brandfetchTickerIconUrls } from "@cobalt-web/clients/brandfetch";
import { useDominantColor } from "@cobalt-web/color-thief";
import { env } from "@cobalt-web/env/web";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

interface AmbientInsetContextValue {
  dominantHex: string | null;
  /** Uppercase ticker when the ticker detail route is active. */
  insetSymbol: string | null;
  /** Company display name for shell header (when on ticker route). */
  tickerCompanyName: string | null;
  /** Clears both symbol and company name when `symbol` is null. */
  setResearchTicker: (
    symbol: string | null,
    companyName?: string | null
  ) => void;
}

const AmbientInsetContext = createContext<AmbientInsetContextValue | null>(
  null
);

export function AmbientInsetProvider({ children }: { children: ReactNode }) {
  const [researchTicker, setResearchTickerState] = useState<{
    companyName: string | null;
    symbol: string | null;
  }>({ companyName: null, symbol: null });

  const setResearchTicker = useCallback(
    (symbol: string | null, companyName: string | null = null) => {
      if (symbol === null) {
        setResearchTickerState({ companyName: null, symbol: null });
      } else {
        setResearchTickerState({ companyName, symbol });
      }
    },
    []
  );

  const { symbol: insetSymbol } = researchTicker;

  const clientId = env.VITE_BRANDFETCH_CLIENT_ID?.trim() ?? "";
  const logoUrl = useMemo(() => {
    if (!insetSymbol || !clientId) {
      return null;
    }
    return (
      brandfetchTickerIconUrls(insetSymbol, clientId, { size: 256 })[0] ?? null
    );
  }, [clientId, insetSymbol]);

  const { hex: dominantHex } = useDominantColor(logoUrl);

  const value = useMemo(
    () => ({
      dominantHex,
      insetSymbol,
      setResearchTicker,
      tickerCompanyName: researchTicker.companyName,
    }),
    [dominantHex, insetSymbol, researchTicker.companyName, setResearchTicker]
  );

  return (
    <AmbientInsetContext.Provider value={value}>
      {children}
    </AmbientInsetContext.Provider>
  );
}

export function useAmbientInset(): AmbientInsetContextValue {
  const ctx = useContext(AmbientInsetContext);
  if (!ctx) {
    throw new Error("useAmbientInset must be used within AmbientInsetProvider");
  }
  return ctx;
}

import { useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

/**
 * Selecting a search result always means: preload route, close palette, navigate.
 * Bundles the three steps for the three result types so callers don't repeat
 * the dance per result kind.
 */
export function useCloseAndGo(onClose: () => void) {
  const navigate = useNavigate();
  const router = useRouter();

  const transaction = useCallback(
    (transactionId: string) => {
      router.preloadRoute({
        params: { transactionId },
        to: "/transactions/$transactionId",
      });
      onClose();
      navigate({
        params: { transactionId },
        to: "/transactions/$transactionId",
      });
    },
    [navigate, onClose, router],
  );

  const chat = useCallback(
    (chatId: string) => {
      router.preloadRoute({ params: { chatId }, to: "/ai-chat/$chatId" });
      onClose();
      navigate({ params: { chatId }, to: "/ai-chat/$chatId" });
    },
    [navigate, onClose, router],
  );

  const ticker = useCallback(
    (symbol: string) => {
      router.preloadRoute({ params: { symbol }, to: "/research/$symbol" });
      onClose();
      navigate({ params: { symbol }, to: "/research/$symbol" });
    },
    [navigate, onClose, router],
  );

  return useMemo(() => ({ chat, ticker, transaction }), [chat, ticker, transaction]);
}

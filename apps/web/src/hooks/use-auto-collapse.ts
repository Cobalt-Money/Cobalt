import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_CLOSE_DELAY = 1000;

export function useAutoCollapse(
  isStreaming: boolean,
  closeDelay: number = DEFAULT_CLOSE_DELAY
) {
  const [isOpen, setIsOpen] = useState(() => isStreaming);
  const prevIsStreamingRef = useRef<boolean | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prevIsStreaming = prevIsStreamingRef.current;

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (isStreaming) {
      setIsOpen(true);
    } else if (prevIsStreaming === true) {
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false);
        closeTimerRef.current = null;
      }, closeDelay);
    }

    prevIsStreamingRef.current = isStreaming;

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isStreaming, closeDelay]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setIsOpen(newOpen);
    if (newOpen && closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const effectiveOpen = isStreaming ? true : isOpen;

  return { handleOpenChange, isOpen: effectiveOpen };
}

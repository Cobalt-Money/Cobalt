import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

/** Matches `NO_MATCH_ID` in Zero queries — never a real `financial_events.id`. */
const NO_ROW_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Loads one financial event + related `event_articles` for `/news/$eventId`.
 */
export function useFinancialEventDetail(eventId: string | undefined) {
  const effectiveId = eventId?.trim() || NO_ROW_ID;
  const [rows] = useQuery(queries.news.eventById({ eventId: effectiveId }));

  const event = useMemo(() => {
    const [first] = rows;
    if (!first || effectiveId === NO_ROW_ID) {
      return;
    }
    return first;
  }, [rows, effectiveId]);

  return { event };
}

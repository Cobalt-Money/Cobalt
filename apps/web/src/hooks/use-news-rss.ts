import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

export interface NewsRssSidebarItem {
  readonly id: string;
  readonly title: string;
  readonly link: string;
  readonly publishedAt: number | null;
}

function toSidebarItem(row: unknown): NewsRssSidebarItem | null {
  if (typeof row !== "object" || row === null) {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id !== undefined && o.id !== null ? String(o.id) : "";
  const title = o.title !== undefined && o.title !== null ? String(o.title) : "";
  const link = o.link !== undefined && o.link !== null ? String(o.link) : "";
  if (!id || !title || !link) {
    return null;
  }
  const publishedAt = typeof o.publishedDate === "number" ? o.publishedDate : null;
  return { id, link, publishedAt, title };
}

/** RSS rows for the News “Latest News” sidebar. */
export function useNewsRssSidebar() {
  const [rows] = useQuery(queries.news.rssSidebar());
  const items = useMemo(() => {
    const out: NewsRssSidebarItem[] = [];
    for (const r of rows) {
      const item = toSidebarItem(r);
      if (item) {
        out.push(item);
      }
    }
    return out;
  }, [rows]);
  return { items };
}

import type { NewsTab } from "@cobalt-web/ui/cobalt/news/news-toolbar";
import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface NewsLayoutContextValue {
  activeTab: NewsTab;
  setActiveTab: (v: NewsTab) => void;
}

const NewsLayoutContext = createContext<NewsLayoutContextValue | null>(null);

export function NewsLayoutProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<NewsTab>("general");
  const value = useMemo(() => ({ activeTab, setActiveTab }), [activeTab]);
  return <NewsLayoutContext.Provider value={value}>{children}</NewsLayoutContext.Provider>;
}

export function useNewsLayout() {
  const ctx = useContext(NewsLayoutContext);
  if (!ctx) {
    throw new Error("useNewsLayout must be used under NewsLayoutProvider");
  }
  return ctx;
}

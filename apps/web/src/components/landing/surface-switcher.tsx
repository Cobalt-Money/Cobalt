import { useState } from "react";

import { ChatGPTVisual } from "./surfaces/chatgpt-visual";
import { CursorVisual } from "./surfaces/cursor-visual";
import { McpVisual } from "./surfaces/mcp-visual";
import { N8nVisual } from "./surfaces/n8n-visual";
import { NotionVisual } from "./surfaces/notion-visual";
import { RaycastVisual } from "./surfaces/raycast-visual";

const SURFACES = [
  { id: "claude", label: "Claude", mobile: true, visual: <McpVisual /> },
  { id: "chatgpt", label: "ChatGPT", mobile: true, visual: <ChatGPTVisual /> },
  { id: "cursor", label: "Cursor", mobile: true, visual: <CursorVisual /> },
  { id: "raycast", label: "Raycast", mobile: true, visual: <RaycastVisual /> },
  { id: "notion", label: "Notion", mobile: false, visual: <NotionVisual /> },
  { id: "n8n", label: "n8n", mobile: false, visual: <N8nVisual /> },
] as const;

export function SurfaceSwitcher() {
  const [active, setActive] = useState<(typeof SURFACES)[number]["id"]>("chatgpt");
  const current = SURFACES.find((s) => s.id === active) ?? SURFACES[0];
  return (
    <div>
      <div className="mb-3 flex flex-wrap justify-center gap-2 sm:gap-3">
        {SURFACES.map((s) => {
          const isActive = s.id === active;
          return (
            <button
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors sm:px-5 sm:py-2.5 sm:text-sm ${
                s.mobile ? "" : "hidden md:inline-flex"
              } ${
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-transparent text-muted-foreground hover:text-foreground"
              }`}
              key={s.id}
              onClick={() => setActive(s.id)}
              type="button"
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <div className="mb-6 text-center text-xs text-muted-foreground sm:mb-8 sm:text-sm">
        <a
          className="underline-offset-4 hover:text-foreground hover:underline"
          href="https://docs.cobaltpf.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          Click here for full list and integration guides
        </a>
      </div>
      <div className="flex min-h-[360px] w-full items-start justify-center sm:min-h-[560px]">
        <div className="w-full">{current.visual}</div>
      </div>
    </div>
  );
}

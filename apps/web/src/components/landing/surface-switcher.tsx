import { useState } from "react";

import { ChatGPTVisual } from "./surfaces/chatgpt-visual";
import { CursorVisual } from "./surfaces/cursor-visual";
import { McpVisual } from "./surfaces/mcp-visual";
import { NotionVisual } from "./surfaces/notion-visual";
import { RaycastVisual } from "./surfaces/raycast-visual";

const SURFACES = [
  { id: "claude", label: "Claude Code", visual: <McpVisual /> },
  { id: "chatgpt", label: "ChatGPT", visual: <ChatGPTVisual /> },
  { id: "cursor", label: "Cursor", visual: <CursorVisual /> },
  { id: "raycast", label: "Raycast", visual: <RaycastVisual /> },
  { id: "notion", label: "Notion", visual: <NotionVisual /> },
] as const;

export function SurfaceSwitcher() {
  const [active, setActive] = useState<(typeof SURFACES)[number]["id"]>("claude");
  const current = SURFACES.find((s) => s.id === active) ?? SURFACES[0];
  return (
    <div>
      <div className="mb-3 flex flex-wrap justify-center gap-3">
        {SURFACES.map((s) => {
          const isActive = s.id === active;
          return (
            <button
              className={`rounded-md border px-5 py-2.5 text-sm font-medium transition-colors ${
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
      <div className="mb-8 text-center text-sm text-muted-foreground">
        <a
          className="underline-offset-4 hover:text-foreground hover:underline"
          href="https://docs.cobaltpf.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          Click here for full list and integration guides
        </a>
      </div>
      <div className="flex min-h-[560px] items-start justify-center">{current.visual}</div>
    </div>
  );
}

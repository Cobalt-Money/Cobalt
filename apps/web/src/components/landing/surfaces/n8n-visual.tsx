import type { ReactNode } from "react";

interface NodeDef {
  id: string;
  x: number;
  y: number;
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconFg: string;
  iconImg?: string;
  iconSvg?: ReactNode;
}

function NodeIcon({ node }: { node: NodeDef }) {
  if (node.iconImg) {
    return (
      <img
        alt={node.title}
        className="size-9 flex-shrink-0 rounded object-contain"
        src={node.iconImg}
        style={{ backgroundColor: node.iconBg }}
      />
    );
  }
  if (node.iconSvg) {
    return (
      <div
        className="flex size-9 flex-shrink-0 items-center justify-center rounded p-1.5"
        style={{ backgroundColor: node.iconBg }}
      >
        {node.iconSvg}
      </div>
    );
  }
  return (
    <div
      className="flex size-9 flex-shrink-0 items-center justify-center rounded font-bold text-[14px]"
      style={{ backgroundColor: node.iconBg, color: node.iconFg }}
    >
      {node.icon}
    </div>
  );
}

const SlackLogo = (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.27 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.522 2.52v6.313A2.528 2.528 0 0 1 8.833 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
      fill="#E01E5A"
    />
    <path
      d="M8.833 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.833 0a2.528 2.528 0 0 1 2.522 2.522v2.52H8.833zm0 1.27a2.527 2.527 0 0 1 2.522 2.521 2.527 2.527 0 0 1-2.522 2.522H2.522A2.527 2.527 0 0 1 0 8.833a2.527 2.527 0 0 1 2.522-2.521h6.311z"
      fill="#36C5F0"
    />
    <path
      d="M18.956 8.833a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.833a2.528 2.528 0 0 1-2.522 2.522h-2.522v-2.522zm-1.268 0a2.527 2.527 0 0 1-2.522 2.522 2.527 2.527 0 0 1-2.523-2.522V2.522A2.527 2.527 0 0 1 15.166 0a2.528 2.528 0 0 1 2.522 2.522v6.311z"
      fill="#2EB67D"
    />
    <path
      d="M15.166 18.956a2.528 2.528 0 0 1 2.522 2.522A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.523-2.522v-2.522h2.523zm0-1.268a2.527 2.527 0 0 1-2.523-2.523 2.526 2.526 0 0 1 2.523-2.521h6.312A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.312z"
      fill="#ECB22E"
    />
  </svg>
);

const SheetsLogo = (
  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path d="M29 4H10a2 2 0 0 0-2 2v36a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2V15z" fill="#0F9D58" />
    <path d="M29 4v9a2 2 0 0 0 2 2h9z" fill="#57BB8A" />
    <path d="M40 15 29 4v9a2 2 0 0 0 2 2z" fill="#F1F1F1" fillOpacity="0.2" />
    <path
      d="M14 22v15h20V22zm6 13h-4v-3h4zm0-5h-4v-3h4zm6 5h-4v-3h4zm0-5h-4v-3h4zm6 5h-4v-3h4zm0-5h-4v-3h4z"
      fill="#F1F1F1"
    />
  </svg>
);

interface EdgeDef {
  from: string;
  to: string;
}

const NODES: NodeDef[] = [
  {
    icon: "C",
    iconBg: "#000",
    iconFg: "#d4a017",
    iconImg: "/cobalt-raycast.png",
    id: "trigger",
    subtitle: "New transaction",
    title: "Cobalt Trigger",
    x: 40,
    y: 190,
  },
  {
    icon: "?",
    iconBg: "#0ea5e9",
    iconFg: "#fff",
    id: "filter",
    subtitle: "amount > $500",
    title: "IF",
    x: 240,
    y: 190,
  },
  {
    icon: "#",
    iconBg: "#fff",
    iconFg: "#ecb22e",
    iconSvg: SlackLogo,
    id: "slack",
    subtitle: "Post #finance",
    title: "Slack",
    x: 460,
    y: 70,
  },
  {
    icon: "S",
    iconBg: "#fff",
    iconFg: "#fff",
    iconSvg: SheetsLogo,
    id: "sheets",
    subtitle: "Append row",
    title: "Google Sheets",
    x: 460,
    y: 320,
  },
];

const EDGES: EdgeDef[] = [
  { from: "trigger", to: "filter" },
  { from: "filter", to: "slack" },
  { from: "filter", to: "sheets" },
];

const NODE_W = 168;
const NODE_H = 64;
const CANVAS_W = 680;
const CANVAS_H = 460;

function curvePath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.max(40, (x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export function N8nVisual() {
  const byId = new Map(NODES.map((n) => [n.id, n]));
  const CARD_H = CANVAS_H + 49; // canvas + toolbar (~49px)
  return (
    <div
      className="mx-auto w-full max-w-[680px]"
      style={{
        containerType: "inline-size",
      }}
    >
      <div
        className="overflow-hidden"
        style={{
          // scale = min(1, container width / CANVAS_W)
          height: `calc(min(100cqw, ${CANVAS_W}px) / ${CANVAS_W} * ${CARD_H}px)`,
        }}
      >
        <div
          className="overflow-hidden rounded-2xl border border-black/10 bg-white text-[#1a1a1a] shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a] dark:text-[#e8e8e8]"
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
            transform: `scale(min(1, 100cqw / ${CANVAS_W}))`,
            transformOrigin: "top left",
            width: CANVAS_W,
          }}
        >
          <div className="flex items-center justify-between border-b border-black/10 bg-[#fafafa] px-4 py-2.5 dark:border-white/10 dark:bg-[#101010]">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded bg-[#ea4b71] font-bold text-[12px] text-white">
                n
              </div>
              <span className="font-semibold text-[13px]">Cobalt → Slack & Sheets</span>
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#9b9a97] dark:text-[#7e7e7e]">
              <span>Last run · 2m ago</span>
              <button
                className="rounded-md border border-black/10 bg-white px-2 py-1 font-medium text-[11px] hover:bg-[#f3f3f3] dark:border-white/10 dark:bg-[#2a2a2a] dark:hover:bg-[#333]"
                type="button"
              >
                Execute workflow
              </button>
            </div>
          </div>
          <div
            className="relative bg-[#f6f6f4] bg-[radial-gradient(circle,rgba(0,0,0,0.18)_1px,transparent_1px)] [background-size:18px_18px] dark:bg-[#0f0f0f] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1px)]"
            style={{ height: CANVAS_H, width: "100%" }}
          >
            <svg
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            >
              {EDGES.map((e) => {
                const a = byId.get(e.from);
                const b = byId.get(e.to);
                if (!a || !b) {
                  return null;
                }
                const x1 = a.x + NODE_W;
                const y1 = a.y + NODE_H / 2;
                const x2 = b.x;
                const y2 = b.y + NODE_H / 2;
                return (
                  <g key={`${e.from}-${e.to}`}>
                    <path
                      d={curvePath(x1, y1, x2, y2)}
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth={2}
                    />
                    <circle cx={x2 - 2} cy={y2} fill="#9ca3af" r={3} />
                  </g>
                );
              })}
            </svg>
            {NODES.map((n) => (
              <div
                className="absolute flex items-center gap-2.5 rounded-lg border border-black/10 bg-white px-3 py-2.5 shadow-sm dark:border-white/15 dark:bg-[#1f1f1f]"
                key={n.id}
                style={{ height: NODE_H, left: n.x, top: n.y, width: NODE_W }}
              >
                <NodeIcon node={n} />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[12px]">{n.title}</div>
                  <div className="truncate text-[10px] text-[#9b9a97] dark:text-[#7e7e7e]">
                    {n.subtitle}
                  </div>
                </div>
              </div>
            ))}
            <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-md border border-black/10 bg-white/90 px-2 py-1 text-[10px] text-[#9b9a97] backdrop-blur dark:border-white/10 dark:bg-[#1a1a1a]/80 dark:text-[#7e7e7e]">
              <span>100%</span>
              <span>·</span>
              <span>Fit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

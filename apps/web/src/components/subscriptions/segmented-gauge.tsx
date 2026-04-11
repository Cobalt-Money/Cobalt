import { cn } from "@cobalt-web/ui/lib/utils";

interface SegmentedGaugeProps {
  value: number;
  max: number;
  segments?: number;
  activeColor?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}

const CX = 160;
const CY = 155;
const R = 120;
const BAR_W = 16;
const BAR_H = 36;
const STAGGER_MS = 22;

function segmentPose(
  i: number,
  segments: number,
  cx: number,
  cy: number,
  r: number
): { rot: number; x: number; y: number } {
  const t = i / (segments - 1);
  const angleDeg = 180 * (1 - t);
  const rad = (angleDeg * Math.PI) / 180;
  let x: number;
  if (i === 0) {
    x = cx - r;
  } else if (i === segments - 1) {
    x = cx + r;
  } else {
    x = cx + r * Math.cos(rad);
  }
  const y = i === 0 || i === segments - 1 ? cy : cy - r * Math.sin(rad);
  let rot: number;
  if (i === 0) {
    rot = -90;
  } else if (i === segments - 1) {
    rot = 90;
  } else {
    rot = 90 - angleDeg;
  }
  return { rot, x, y };
}

export function SegmentedGauge({
  value,
  max,
  segments = 16,
  activeColor = "#22c55e",
  label,
  sublabel,
  className,
}: SegmentedGaugeProps) {
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const filled = Math.round(pct * segments);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        viewBox="0 0 320 175"
        className="w-full max-w-sm"
        role="img"
        aria-label={`Gauge: ${Math.round(pct * 100)}%`}
      >
        {Array.from({ length: segments }, (_, i) => {
          const t = i / (segments - 1);
          const { rot, x, y } = segmentPose(i, segments, CX, CY, R);
          const active = i < filled;

          const delay = active
            ? i * STAGGER_MS
            : (segments - 1 - i) * STAGGER_MS;

          const transform = `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)})`;

          return (
            <g key={`gauge-seg-${segments}-${i}`} transform={transform}>
              <rect
                x={-BAR_W / 2}
                y={-BAR_H / 2}
                width={BAR_W}
                height={BAR_H}
                rx={BAR_W / 2}
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                opacity={active ? 0 : 0.18}
                style={{ transition: `opacity 120ms ease ${delay}ms` }}
              />
              <rect
                x={-BAR_W / 2}
                y={-BAR_H / 2}
                width={BAR_W}
                height={BAR_H}
                rx={BAR_W / 2}
                fill={activeColor}
                opacity={active ? 1 - t * 0.35 : 0}
                style={{ transition: `opacity 120ms ease ${delay}ms` }}
              />
            </g>
          );
        })}

        {label && (
          <text
            x={CX}
            y={CY - 40}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="currentColor"
            style={{ fontSize: 30, fontWeight: 700 }}
          >
            {label}
          </text>
        )}
        {sublabel && (
          <text
            x={CX}
            y={CY - 14}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="currentColor"
            opacity={0.5}
            style={{ fontSize: 11 }}
          >
            {sublabel}
          </text>
        )}
      </svg>
    </div>
  );
}

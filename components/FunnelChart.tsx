"use client";

import { FunnelStage } from "@/lib/types";

interface FunnelChartProps {
  stages: FunnelStage[];
  selectedIndex?: number | null;
  onStageClick?: (index: number) => void;
}

const SVG_WIDTH = 560;
const MAX_BAR_WIDTH = 240;
const CENTER_X = 160;
const STAGE_HEIGHT = 64;
const GAP = 3;
const LABEL_X = CENTER_X + MAX_BAR_WIDTH / 2 + 20;
const MIN_RATIO = 0.18;

export default function FunnelChart({ stages, selectedIndex, onStageClick }: FunnelChartProps) {
  if (!stages.length) return null;

  const maxValue = stages[0].value || 1;
  const totalHeight = stages.length * STAGE_HEIGHT + (stages.length - 1) * GAP + 10;
  const hasFilter = selectedIndex != null;

  const getW = (value: number) =>
    Math.max(MIN_RATIO, value / maxValue) * MAX_BAR_WIDTH;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${totalHeight}`}
        className="w-full"
        style={{ minWidth: 320, maxHeight: 440 }}
        aria-label="Funnel de conversión"
      >
        {stages.map((stage, i) => {
          const y = i * (STAGE_HEIGHT + GAP);
          const topW = getW(stage.value);
          const nextValue = stages[i + 1]?.value ?? stage.value * 0.85;
          const bottomW = i < stages.length - 1 ? getW(nextValue) : topW * 0.82;

          const x1 = CENTER_X - topW / 2;
          const x2 = CENTER_X + topW / 2;
          const x3 = CENTER_X + bottomW / 2;
          const x4 = CENTER_X - bottomW / 2;
          const midY = y + STAGE_HEIGHT / 2;
          const prevValue = i === 0 ? stage.value : (stages[i - 1]?.value || 1);
          const pct = prevValue > 0 ? Math.round((stage.value / prevValue) * 100) : 0;
          const isSelected = selectedIndex === i;
          const isDimmed = hasFilter && !isSelected;

          return (
            <g
              key={stage.label}
              onClick={() => onStageClick?.(i)}
              style={{ cursor: onStageClick ? "pointer" : "default" }}
            >
              <polygon
                points={`${x1},${y} ${x2},${y} ${x3},${y + STAGE_HEIGHT} ${x4},${y + STAGE_HEIGHT}`}
                fill={stage.color}
                opacity={isDimmed ? 0.35 : 1}
                stroke={isSelected ? "white" : "none"}
                strokeWidth={isSelected ? 3 : 0}
              />
              <text
                x={CENTER_X}
                y={midY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="13"
                fontWeight="700"
                opacity={isDimmed ? 0.4 : 1}
              >
                {pct}%
              </text>
              <text
                x={LABEL_X}
                y={midY - 9}
                fill={isSelected ? "#1e1b4b" : "#374151"}
                fontSize="11.5"
                fontWeight={isSelected ? "700" : "600"}
                opacity={isDimmed ? 0.4 : 1}
              >
                {stage.label}
              </text>
              <text
                x={LABEL_X}
                y={midY + 9}
                fill="#6B7280"
                fontSize="11"
                opacity={isDimmed ? 0.4 : 1}
              >
                {stage.value.toLocaleString("es-MX")} leads
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

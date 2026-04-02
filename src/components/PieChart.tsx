"use client";

import { useState, useMemo } from "react";

interface Slice {
  label: string;
  value: number;
  color: string;
}

function buildSlicePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export function PieChart({
  data,
  title,
  size = 200,
}: {
  data: Slice[];
  title: string;
  size?: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  const slices = useMemo(() => {
    if (total === 0) return [];
    // Compute cumulative angles using reduce to avoid reassignment
    const withAngles = data.reduce<{ d: Slice; start: number; end: number }[]>(
      (acc, d) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].end : -Math.PI / 2;
        const span = (d.value / total) * 2 * Math.PI;
        acc.push({ d, start: prev, end: prev + span });
        return acc;
      },
      []
    );
    return withAngles.map(({ d, start, end }) => ({
      ...d,
      path: buildSlicePath(cx, cy, r, start, end),
    }));
  }, [data, total, cx, cy, r]);

  if (total === 0 || data.length === 0) {
    return (
      <div className="flex flex-col items-center">
        <h4 className="text-sm font-medium text-white mb-3">{title}</h4>
        <div
          className="flex items-center justify-center rounded-full border-2 border-neutral-800"
          style={{ width: size, height: size }}
        >
          <span className="text-xs text-neutral-600">暂无数据</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <h4 className="text-sm font-medium text-white mb-3">{title}</h4>
      <div className="relative">
        <svg width={size} height={size}>
          {slices.map((s, i) => (
            <path
              key={i}
              d={s.path}
              fill={s.color}
              stroke="#171717"
              strokeWidth={2}
              opacity={hoverIdx === i ? 1 : 0.8}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          ))}
          <circle cx={cx} cy={cy} r={r * 0.55} fill="#0a0a0a" />
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize={10} fill="#a3a3a3">
            {data.length} 项
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize={12} fill="#e5e5e5" fontWeight={600}>
            {total >= 10000 ? `${(total / 10000).toFixed(1)}万` : total.toFixed(0)}
          </text>
        </svg>
        {hoverIdx != null && slices[hoverIdx] && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 shadow-lg text-center whitespace-nowrap">
              <p className="text-xs text-neutral-400">{slices[hoverIdx].label}</p>
              <p className="text-sm font-bold text-white">
                {(slices[hoverIdx].value / 10000).toFixed(2)}万
              </p>
              <p className="text-xs text-neutral-500">
                {((slices[hoverIdx].value / total) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1 w-full px-2">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-xs cursor-pointer hover:bg-neutral-800/50 rounded px-1 py-0.5"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-neutral-400 truncate">{d.label}</span>
            </div>
            <span className="text-neutral-300 ml-2">{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
